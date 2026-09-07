import { useEffect, useState } from 'react';
import { ArrowUpRight, RefreshCw } from 'lucide-react';
type Feed = {
  lastChecked: string;
  items: {
    id: string;
    title: string;
    date: string;
    url: string;
    authors: string;
    status: string;
  }[];
};
export default function Discoveries() {
  const [data, setData] = useState<Feed | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const refresh = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/data/discoveries.json', { cache: 'no-cache' });
      if (!r.ok) throw Error();
      const d = (await r.json()) as Feed;
      if (!Array.isArray(d.items) || !d.lastChecked) throw Error();
      setData(d);
    } catch {
      setError('Não foi possível carregar as descobertas. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 300000);
    return () => clearInterval(t);
  }, []);
  return (
    <section className="discoveries">
      <div className="lower-heading">
        <div>
          <span className="eyebrow teal">BIBLIOTECA EM ATUALIZAÇÃO</span>
          <h2>Novas publicações para explorar</h2>
        </div>
        <button
          className="secondary-button"
          disabled={busy}
          onClick={() => void refresh()}
        >
          <RefreshCw size={16} /> {busy ? 'Carregando…' : 'Atualizar lista'}
        </button>
      </div>
      <p>
        Busca diária no PubMed por relatos de caso com radiologia ou imagem.
        Estas descobertas ainda não passaram pela curadoria didática.
      </p>
      {data && (
        <p className="image-note">
          Última consulta: {new Date(data.lastChecked).toLocaleString('pt-BR')}{' '}
          · Os títulos são exibidos no idioma da publicação.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      <div className="discovery-list">
        {data?.items.map((item) => (
          <a key={item.id} href={item.url} target="_blank" rel="noreferrer">
            <div>
              <small>{item.date} · PUBMED</small>
              <h3>{item.title}</h3>
              <p>{item.authors}</p>
              <span>Descoberta automática · não revisada</span>
            </div>
            <ArrowUpRight size={20} />
          </a>
        ))}
      </div>
      {data && !data.items.length && (
        <p>Nenhuma publicação nova encontrada no intervalo consultado.</p>
      )}
    </section>
  );
}
