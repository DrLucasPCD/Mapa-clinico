import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, ScanLine } from 'lucide-react';

const modalities = ['TC', 'RM', 'RX', 'USG'] as const;
type Modality = (typeof modalities)[number];
type VisualCase = {
  id: string;
  pmcid: string;
  title: string;
  authors: string;
  date: string;
  modality: Modality;
  label: string;
  image: string;
  caption: string;
  translation?: { title: string; caption: string; reviewed?: boolean };
  source: string;
  licence: string;
};
type Catalog = { checkedAt: string; items: VisualCase[] };

const prompts: Record<Modality, string> = {
  TC: 'Descreva a região, o plano e as mudanças de atenuação ou realce que consegue identificar.',
  RM: 'Descreva a região e como o sinal do achado se compara ao dos tecidos vizinhos.',
  RX: 'Identifique a região e procure alterações nos contornos, na densidade ou no alinhamento.',
  USG: 'Identifique a janela e descreva a ecogenicidade do achado em relação às estruturas vizinhas.',
};
const dateInRecife = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeZone: 'America/Recife',
});
const recifeDay = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'America/Recife',
});
const searchText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
const figureLabel = (label: string) =>
  label.replace(/^Fig(?:ure)?\.?(?=\s|$)/i, 'Figura');
const caseDate = (date: string) =>
  dateInRecife.format(new Date(date + 'T12:00:00Z'));

export default function VisualCaseCatalog() {
  const [catalog, setCatalog] = useState<Catalog>();
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [modality, setModality] = useState<Modality | ''>('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState('');
  const [day, setDay] = useState(() => recifeDay.format());
  useEffect(() => {
    const request = new AbortController();
    fetch('/data/visual-cases.json', {
      signal: request.signal,
      cache: 'no-cache',
    })
      .then((response) => {
        if (!response.ok) throw new Error('Consulta indisponível');
        return response.json() as Promise<Catalog>;
      })
      .then((data) => {
        if (
          !Array.isArray(data.items) ||
          !Number.isFinite(Date.parse(data.checkedAt))
        )
          throw new Error('Catálogo inválido');
        setCatalog(data);
        setError(false);
      })
      .catch(() => {
        if (!request.signal.aborted) setError(true);
      });
    return () => request.abort();
  }, [retry, day]);

  useEffect(() => {
    const checkDate = () => setDay(recifeDay.format());
    const timer = window.setInterval(checkDate, 60_000);
    window.addEventListener('focus', checkDate);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', checkDate);
    };
  }, []);

  if (!catalog)
    return (
      <div className="training-card">
        <output>
          {error
            ? 'O catálogo de casos está temporariamente indisponível.'
            : 'Carregando casos com imagem…'}
        </output>
        {error && (
          <button
            className="training-secondary"
            onClick={() => {
              setError(false);
              setRetry((value) => value + 1);
            }}
          >
            Tentar novamente
          </button>
        )}
      </div>
    );

  const dailyCases = catalog.items.filter(
    (item, index, items) =>
      items.findIndex((entry) => entry.pmcid === item.pmcid) === index,
  );
  const dayNumber = Math.floor(Date.parse(day) / 86_400_000);
  const daily = dailyCases.length
    ? dailyCases[dayNumber % dailyCases.length]
    : undefined;
  const normalizedQuery = searchText(query.trim());
  const visible = catalog.items.filter(
    (item) =>
      (!modality || item.modality === modality) &&
      searchText(
        `${item.translation?.title ?? ''} ${item.title} ${item.authors} ${item.pmcid}`,
      ).includes(normalizedQuery),
  );
  const current =
    visible.find((item) => item.id === selected) ??
    (!modality && !normalizedQuery ? daily : undefined) ??
    visible[0];
  const position = current ? visible.indexOf(current) : -1;
  const showDaily = () => {
    setModality('');
    setQuery('');
    setSelected(daily?.id ?? '');
  };
  return (
    <>
      <div className="visual-daily">
        <button
          className="training-primary"
          disabled={!daily}
          onClick={showDaily}
        >
          <CalendarDays size={17} /> Caso do dia
        </button>
        <span>
          <strong>{dailyCases.length} casos publicados</strong> · Consulta em{' '}
          {dateInRecife.format(new Date(catalog.checkedAt))}
        </span>
      </div>
      {error && (
        <output className="training-note">
          Exibindo o último catálogo disponível.
        </output>
      )}
      <div className="visual-case-grid">
        <aside
          className="training-card visual-case-picker"
          aria-label="Catálogo de casos"
        >
          <div className="library-filters">
            <label>
              Modalidade
              <select
                value={modality}
                onChange={(event) =>
                  setModality(event.target.value as Modality | '')
                }
              >
                <option value="">Todas</option>
                {modalities.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
            <label>
              Buscar caso
              <input
                type="search"
                placeholder="Tema, autor ou código PMC"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          </div>
          <p className="training-note">
            {visible.length} {visible.length === 1 ? 'exercício' : 'exercícios'}{' '}
            com imagem
          </p>
          <div className="visual-case-list">
            {visible.map((item) => (
              <button
                type="button"
                className="training-secondary"
                key={item.id}
                aria-pressed={item.id === current?.id}
                onClick={() => setSelected(item.id)}
              >
                <ScanLine size={17} aria-hidden="true" />
                <span>
                  <strong>
                    {item.modality} · {item.pmcid}
                  </strong>
                  <small>
                    {caseDate(item.date)} · {figureLabel(item.label)}
                  </small>
                </span>
              </button>
            ))}
          </div>
        </aside>
        {current ? (
          <div className="visual-case-detail">
            <PublishedExercise
              key={current.id}
              item={current}
              isDaily={current.id === daily?.id}
            />
            <div className="visual-case-nav">
              <button
                type="button"
                className="training-secondary"
                disabled={position <= 0}
                onClick={() => setSelected(visible[position - 1].id)}
              >
                <ArrowLeft size={16} /> Anterior
              </button>
              <span>
                {position + 1} de {visible.length}
              </span>
              <button
                type="button"
                className="training-secondary"
                disabled={position >= visible.length - 1}
                onClick={() => setSelected(visible[position + 1].id)}
              >
                Próximo <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          <output className="training-card">
            Nenhum caso encontrado para esses filtros.
          </output>
        )}
      </div>
    </>
  );
}

function PublishedExercise({
  item,
  isDaily,
}: {
  item: VisualCase;
  isDaily: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  return (
    <article className="training-card visual-published-exercise">
      <header>
        <h3>{isDaily ? 'Caso do dia' : 'Leitura de imagem'}</h3>
        <span>
          {item.modality} · {item.pmcid} · {figureLabel(item.label)}
        </span>
      </header>
      <p>{prompts[item.modality]}</p>
      {unavailable ? (
        <output>
          A figura está indisponível no aplicativo.{' '}
          <a href={item.source} target="_blank" rel="noreferrer">
            Abra o artigo original
          </a>
          .
        </output>
      ) : (
        <figure className="training-figure">
          {/* oxlint-disable-next-line next/no-img-element -- Vite displays the licensed figure at its original aspect ratio. */}
          <img
            src={item.image}
            alt={`${figureLabel(item.label)} do exame de ${item.modality}`}
            onError={() => setUnavailable(true)}
          />
          <figcaption>
            {item.authors} ·{' '}
            <a href={item.licence} target="_blank" rel="noreferrer">
              Licença
            </a>
          </figcaption>
        </figure>
      )}
      <label className="visual-case-note">
        Minha leitura do exame
        <textarea
          rows={2}
          placeholder="Anote os achados antes de comparar com a publicação."
        />
      </label>
      <button
        className="training-primary"
        onClick={() => setRevealed((value) => !value)}
        aria-expanded={revealed}
      >
        {revealed ? 'Ocultar legenda' : 'Revelar legenda'}
      </button>
      {revealed && (
        <div className="training-feedback">
          {item.translation ? (
            <>
              <h3 lang="pt-BR">{item.translation.title}</h3>
              <p lang="pt-BR">{item.translation.caption}</p>
              {!item.translation.reviewed && (
                <p className="training-note">Tradução automática</p>
              )}
              <details className="visual-original-caption">
                <summary>Ver título e legenda originais em inglês</summary>
                <h3 lang="en">{item.title}</h3>
                <p lang="en">{item.caption}</p>
              </details>
            </>
          ) : (
            <>
              <h3 lang="en">{item.title}</h3>
              <p lang="en">{item.caption}</p>
              <p className="training-note">Legenda original em inglês</p>
            </>
          )}
          <a href={item.source} target="_blank" rel="noreferrer">
            Ler o caso completo
          </a>
        </div>
      )}
    </article>
  );
}
