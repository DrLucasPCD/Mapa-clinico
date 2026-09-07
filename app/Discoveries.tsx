import { useEffect, useState } from 'react';
import { ArrowUpRight, Bookmark, RefreshCw, Search } from 'lucide-react';
import './panels.css';
type Article = {
  id: string;
  title: string;
  date: string;
  url: string;
  authors: string;
  status: string;
};
type Feed = { lastChecked: string; items: Article[] };
function validArticle(x: Article) {
  return (
    x &&
    /^\d+$/.test(x.id) &&
    x.url === `https://pubmed.ncbi.nlm.nih.gov/${x.id}/` &&
    typeof x.title === 'string'
  );
}
export default function Discoveries() {
  const [data, setData] = useState<Feed | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [tab, setTab] = useState('publications'),
    [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState<Article[]>(() => {
    try {
      const value = JSON.parse(
        localStorage.getItem('mapa-saved-publications') || '[]',
      );
      return Array.isArray(value) ? value.filter(validArticle) : [];
    } catch {
      return [];
    }
  });
  const refresh = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/data/discoveries.json', { cache: 'no-cache' });
      if (!r.ok) throw Error();
      const d = await r.json();
      if (!Array.isArray(d.items) || !d.lastChecked) throw Error();
      setData({ ...d, items: d.items.filter(validArticle) });
    } catch {
      setError('Não foi possível atualizar a lista. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 300000);
    return () => clearInterval(id);
  }, []);
  const toggle = (item: Article) => {
    const next = favorites.some((x) => x.id === item.id)
      ? favorites.filter((x) => x.id !== item.id)
      : [...favorites, item];
    setFavorites(next);
    try {
      localStorage.setItem('mapa-saved-publications', JSON.stringify(next));
    } catch {}
  };
  const items = (tab === 'favorites' ? favorites : data?.items || []).filter(
    (x) =>
      `${x.title} ${x.authors}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <section className="discoveries publications-panel">
      <div
        className="panel-tabs"
        role="tablist"
        aria-label="Biblioteca clínica"
      >
        {[
          ['publications', 'Publicações'],
          ['guidelines', 'Diretrizes'],
          ['favorites', 'Favoritos'],
        ].map(([value, label]) => (
          <button
            key={value}
            role="tab"
            aria-selected={tab === value}
            className={tab === value ? 'active' : ''}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <label className="publication-search">
        <Search size={16} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar nesta lista…"
          aria-label="Buscar publicações"
        />
      </label>
      <div className="lower-heading">
        <h2>
          {tab === 'favorites'
            ? 'Publicações salvas'
            : 'Novas publicações para explorar'}
        </h2>
        <button
          className="secondary-button"
          onClick={() => void refresh()}
          disabled={busy}
        >
          <RefreshCw size={13} />
          {busy ? 'Atualizando…' : 'Atualizar lista'}
        </button>
      </div>
      {data && (
        <p>
          Última consulta:{' '}
          {new Date(data.lastChecked).toLocaleDateString('pt-BR')} · Busca
          diária no PubMed.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {tab === 'guidelines' ? (
        <p>
          Esta biblioteca reúne relatos de caso. Diretrizes clínicas ainda não
          foram incorporadas.
        </p>
      ) : (
        <div className="discovery-list">
          {items.map((item) => (
            <article key={item.id} className="publication-card">
              <a href={item.url} target="_blank" rel="noreferrer">
                <small>{item.date} · PUBMED</small>
                <h3>{item.title}</h3>
                <p>{item.authors}</p>
                <span>Descoberta automática · não revisada</span>
              </a>
              <button
                aria-label={
                  (favorites.some((x) => x.id === item.id)
                    ? 'Remover publicação salva: '
                    : 'Salvar publicação: ') + item.title
                }
                onClick={() => toggle(item)}
              >
                <Bookmark
                  size={15}
                  fill={
                    favorites.some((x) => x.id === item.id)
                      ? 'currentColor'
                      : 'none'
                  }
                />
              </button>
            </article>
          ))}
          {!items.length && (
            <p>
              {tab === 'favorites'
                ? 'Nenhuma publicação salva para esta busca.'
                : 'Nenhuma publicação encontrada nesta lista.'}
            </p>
          )}
        </div>
      )}
      <a
        className="pubmed-link"
        href={
          'https://pubmed.ncbi.nlm.nih.gov/?term=' +
          encodeURIComponent(query || 'radiology case reports')
        }
        target="_blank"
        rel="noreferrer"
      >
        Pesquisar no PubMed <ArrowUpRight size={14} />
      </a>
    </section>
  );
}
