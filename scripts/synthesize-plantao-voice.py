"""Render the reviewed Modo Plantão transcripts with the pinned Faber voice."""
import hashlib
from io import BytesIO
import json
from pathlib import Path
import re
import subprocess
import sys
from tempfile import TemporaryDirectory
import wave

from piper import PiperVoice

model = Path(sys.argv[1])
config = model.with_suffix(".onnx.json")
pinned = {
    model: "858555e3a064209c57088fe6bd70c4c3dc54d03eaa00c45d5ecaf43a33f95aa7",
    config: "7e694de195ae3fc36dd732c445eb04fb49b649854893cb5506b978f0d50a1d6f",
}
for file, digest in pinned.items():
    with file.open("rb") as handle:
        if hashlib.file_digest(handle, "sha256").hexdigest() != digest:
            raise ValueError(f"Revisão do modelo Faber inesperada: {file.name}")

voice = PiperVoice.load(model, config_path=config)
root = Path(__file__).resolve().parents[1] / "public/audio/plantao"
root.mkdir(parents=True, exist_ok=True)
clips = json.load(sys.stdin)

with TemporaryDirectory(dir=root) as directory:
    stage = Path(directory)
    for index, clip in enumerate(clips, 1):
        if not re.fullmatch(r"/audio/plantao/[0-9a-f]{8}\.mp3", clip["url"]):
            raise ValueError("Caminho inválido de áudio do Plantão")
        filename = clip["url"].rsplit("/", 1)[1]
        destination = root / filename
        if destination.exists():
            continue
        wav = BytesIO()
        with wave.open(wav, "wb") as handle:
            voice.synthesize_wav(clip["text"], handle)
        subprocess.run(
            [
                "ffmpeg", "-nostdin", "-v", "error", "-f", "wav", "-i", "pipe:0",
                "-ac", "1", "-c:a", "libmp3lame", "-b:a", "48k",
                str(stage / filename),
            ],
            input=wav.getvalue(),
            check=True,
        )
        (stage / filename).replace(destination)
        if index % 40 == 0:
            print(f"{index}/{len(clips)} falas", flush=True)

print(f"{len(clips)} falas disponíveis em {root}", flush=True)
