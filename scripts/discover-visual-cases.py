"""Publish a daily selection of original, redistributable radiology figures."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path, PurePosixPath
import re
import time
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode, urlsplit
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public/data/visual-cases.json"
EUROPE_PMC = "https://www.ebi.ac.uk/europepmc/webservices/rest"
PMC_CLOUD = "https://pmc-oa-opendata.s3.amazonaws.com"
S3_XML = {"s3": "http://s3.amazonaws.com/doc/2006-03-01/"}
XLINK = "{http://www.w3.org/1999/xlink}href"
ALI = "{http://www.niso.org/schemas/ali/1.0/}license_ref"
LICENSES = {
    "CC BY": "https://creativecommons.org/licenses/by/4.0/",
    "CC BY-SA": "https://creativecommons.org/licenses/by-sa/4.0/",
}
MODALITIES = {
    "TC": ('"computed tomography" OR "CT scan"', r"\b(?:computed tomography|CT(?:PA)?|CTA)\b"),
    "RM": ('"magnetic resonance imaging" OR MRI', r"\b(?:magnetic resonance|MR(?:I|CP|A)?)\b"),
    "RX": ('radiograph OR "chest x-ray"', r"\b(?:radiograph\w*|X[- ]?ray\w*|CXR)\b"),
    "USG": ('ultrasonography OR ultrasound', r"\b(?:ultra[- ]?sound|ultrasonogra\w*|sonograph\w*|echocardiogra\w*|Doppler|USG|POCUS)\b"),
}
THIRD_PARTY = re.compile(
    r"adapted from|reproduced from|reprinted|courtesy of|obtained from|"
    r"with permission|permission granted|previously published|©|copyright", re.I
)
NON_CLINICAL = re.compile(
    r"\bschema(?:tic)?\b|\billustrat(?:ion|ive)\b|\bflowchart\b|\bhistology\b|"
    r"\bgraphic(?:al)? abstract\b|\bSPECT\b|\bPET\b|scintigraph", re.I
)


def get(url):
    for attempt in range(3):
        try:
            request = Request(url, headers={"User-Agent": "Mapa-Clinico-Visual-Training/1.0"})
            with urlopen(request, timeout=12) as response:
                return response.read(8_000_000)
        except HTTPError as error:
            if error.code not in (429, 500, 502, 503, 504) or attempt == 2:
                raise
        except (TimeoutError, URLError):
            if attempt == 2:
                raise
        time.sleep(1 + attempt)


def search(modality, now, days):
    terms = MODALITIES[modality][0].replace(" OR ", " OR TITLE_ABS:")
    lower = (now - timedelta(days=days)).date()
    query = (
        "OPEN_ACCESS:Y AND IN_PMC:Y AND LANG:eng AND (PUB_TYPE:\"case reports\" OR TITLE:\"case report\" "
        "OR TITLE:\"report of two cases\") "
        f"AND (TITLE_ABS:{terms}) AND FIRST_PDATE:[{lower} TO {now.date()}] sort_date:y"
    )
    params = urlencode({"query": query, "format": "json", "pageSize": 40})
    results = json.loads(get(f"{EUROPE_PMC}/search?{params}"))
    return results["resultList"]["result"]


def cloud_url(key):
    return f"{PMC_CLOUD}/{quote(key, safe='/')}"


def read_text(element):
    return " ".join("".join(element.itertext()).split()) if element is not None else ""


def figure_modality(caption):
    matches = [name for name, (_, pattern) in MODALITIES.items() if re.search(pattern, caption, re.I)]
    return matches[0] if len(matches) == 1 else None


def load_case(record):
    pmcid = record.get("pmcid", "")
    date = record.get("firstPublicationDate", "")
    if (not re.fullmatch(r"PMC\d+", pmcid) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", date)
            or not record.get("authorString") or not record.get("title")):
        return []
    # Look up the latest deposited version, including its explicit reuse licence.
    prefix = f"metadata/{pmcid}."
    listing = ET.fromstring(get(f"{PMC_CLOUD}/?{urlencode({'list-type': '2', 'prefix': prefix})}"))
    keys = [key.text for key in listing.findall("s3:Contents/s3:Key", S3_XML)]
    version_pattern = re.compile(rf"{re.escape(prefix)}(\d+)\.json")
    versions = {int(match[1]): key for key in keys if (match := version_pattern.fullmatch(key))}
    if not versions:
        return []
    meta = json.loads(get(cloud_url(versions[max(versions)])))
    licence = LICENSES.get(meta.get("license_code"))
    if (
        not licence or not meta.get("is_pmc_openaccess") or meta.get("is_manuscript")
        or meta.get("is_retracted") or not meta.get("xml_url") or not meta.get("media_urls")
    ):
        return []
    directory = f"/{pmcid}.{max(versions)}/"

    def media_key(link):
        uri = urlsplit(link)
        if uri.scheme == "s3" and uri.netloc == "pmc-oa-opendata" and uri.path.startswith(directory):
            return uri.path.lstrip("/")
        return ""

    media = [key for uri in meta["media_urls"] if (key := media_key(uri))]
    images = {PurePosixPath(key).stem: key for key in media
              if PurePosixPath(key).suffix.lower() in (".jpg", ".jpeg", ".png", ".webp")}
    xml_key = media_key(meta["xml_url"])
    if not xml_key or not images:
        return []
    article = ET.fromstring(get(cloud_url(xml_key)))
    for lic in article.findall("./front/article-meta/permissions/license"):
        text = f"{lic.attrib.get(XLINK, '')} {read_text(lic.find(ALI))} {read_text(lic)}"
        link = re.search(r"https?://creativecommons\.org/licenses/(by|by-sa)/(2\.0|2\.5|3\.0|4\.0)(?=/|[\s.)]|$)", text)
        if link:
            licence = f"https://creativecommons.org/licenses/{link[1]}/{link[2]}/"
            break
    found = {}
    for fig in article.findall("./body//fig"):
        caption = read_text(fig.find("caption"))
        if (not 24 <= len(caption) <= 1600 or THIRD_PARTY.search(caption)
                or NON_CLINICAL.search(caption) or fig.find("permissions") is not None
                or fig.find("attrib") is not None or fig.find(".//xref[@ref-type='bibr']") is not None):
            continue
        modality = figure_modality(caption)
        if not modality or modality in found:
            continue
        graphics = fig.findall("./graphic") + fig.findall("./alternatives/graphic")
        image = next((images[stem] for graphic in graphics
                      if (stem := PurePosixPath(graphic.attrib.get(XLINK, "")).stem) in images), None)
        if not image:
            continue
        number = read_text(fig.find("label")) or "Figura"
        found[modality] = {
            "id": f"{pmcid}-{modality.lower()}",
            "pmcid": pmcid,
            "title": record["title"].rstrip("."),
            "authors": record["authorString"],
            "date": date,
            "modality": modality,
            "label": number,
            "image": cloud_url(image),
            "caption": caption,
            "source": f"https://pmc.ncbi.nlm.nih.gov/articles/{pmcid}/",
            "licence": licence,
        }
    return list(found.values())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=180, help="Janela da busca")
    parser.add_argument("--per-modality", type=int, default=12, help="Máximo de casos por modalidade")
    args = parser.parse_args()
    now = datetime.now(timezone.utc)
    previous = json.loads(OUTPUT.read_text()) if OUTPUT.exists() else {"items": []}
    with ThreadPoolExecutor(max_workers=6) as workers:
        search_results = workers.map(lambda name: search(name, now, args.days), MODALITIES)
        records = {record["pmcid"]: record for group in search_results for record in group if record.get("pmcid")}
        if not records:
            raise RuntimeError("A busca não retornou candidatos. Catálogo anterior preservado.")
        discovered = []
        checked = set()
        errors = 0
        jobs = {pmcid: workers.submit(load_case, record) for pmcid, record in records.items()}
        for index, (pmcid, job) in enumerate(jobs.items()):
            try:
                discovered.extend(job.result())
                checked.add(pmcid)
            except (HTTPError, URLError, TimeoutError, ValueError, ET.ParseError) as error:
                errors += 1
                print(f"{pmcid}: {error}", flush=True)
            if index % 35 == 0:
                print(f"Verificados: {index + 1}/{len(records)}", flush=True)
    if errors > len(records) // 2 or (not discovered and not previous["items"]):
        raise RuntimeError("Consulta incompleta. Catálogo anterior preservado.")
    # Keep prior entries if the source failed transiently or they left the search
    # page. Replace every successfully checked article as an atomic unit.
    merged = [item for item in previous["items"] if item["pmcid"] not in checked] + discovered
    items = []
    for modality in MODALITIES:
        ordered = sorted((item for item in merged if item["modality"] == modality),
                         key=lambda item: (item["date"], item["id"]), reverse=True)
        items.extend(ordered[:args.per_modality])
    items.sort(key=lambda item: (item["date"], item["id"]), reverse=True)
    translations = {
        (item["title"], item["caption"]): item["translation"]
        for item in previous["items"]
        if item.get("translation", {}).get("title") and item["translation"].get("caption")
    }
    for item in items:
        translation = translations.get((item["title"], item["caption"]))
        if translation:
            item["translation"] = translation
    content = {"checkedAt": now.isoformat(timespec="seconds"), "items": items}
    draft = OUTPUT.with_suffix(".tmp")
    draft.write_text(json.dumps(content, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    draft.replace(OUTPUT)
    print(f"{len(items)} exercícios com figuras de {len({item['pmcid'] for item in items})} artigos.")


if __name__ == "__main__":
    main()
