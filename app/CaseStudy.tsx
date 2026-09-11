import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Expand,
  ScanLine,
  RotateCcw,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import type { ClinicalCase } from './content';
import './panels.css';
import { imageIntegration } from './image-integration';
export default function CaseStudy({
  item,
  period,
  onLocate,
  caseIndex,
  caseCount,
  onPreviousCase,
  onNextCase,
  onOpenDicom,
}: {
  onOpenDicom?: () => void;
  item: ClinicalCase;
  period: number;
  onLocate: () => void;
  caseIndex?: number;
  caseCount?: number;
  onPreviousCase?: () => void;
  onNextCase?: () => void;
}) {
  const [index, setIndex] = useState(0),
    [zoom, setZoom] = useState(1),
    [contrast, setContrast] = useState(100),
    [brightness, setBrightness] = useState(100),
    [answer, setAnswer] = useState<number | null>(null),
    [reveal, setReveal] = useState(false),
    [panel, setPanel] = useState<'cases' | 'images' | 'questions'>('cases'),
    [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);
  const integration = imageIntegration(item.images, item.acquisition);
  const image = item.images[index] || item.images[0];
  return (
    <section className="case-detail clinical-panel">
      <div className="panel-tabs" role="tablist" aria-label="Conteúdo clínico">
        {(
          [
            ['cases', 'Casos clínicos'],
            ['images', 'Imagens'],
            ['questions', 'Questões'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            role="tab"
            aria-selected={panel === value}
            className={panel === value ? 'active' : ''}
            onClick={() => setPanel(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="case-top">
        <span className="level-badge">
          CASO REAL · {item.modality} · rID {item.id}
        </span>
        <a href={item.source} target="_blank" rel="noreferrer">
          Caso original <ArrowUpRight size={15} />
        </a>
      </div>
      <div className="case-heading-row">
        <div>
          <h2>{item.title}</h2>
          <p>{item.presentation}</p>
        </div>
        <div
          className="case-pagination"
          aria-label={caseCount ? 'Paginação de casos' : 'Imagem do caso'}
        >
          <button
            aria-label={caseCount ? 'Caso anterior' : 'Imagem anterior'}
            disabled={caseCount ? !onPreviousCase : index === 0}
            onClick={
              caseCount && onPreviousCase
                ? onPreviousCase
                : () => setIndex((value) => Math.max(0, value - 1))
            }
          >
            <ArrowLeft size={14} />
          </button>
          <span>
            {caseCount && caseIndex !== undefined ? caseIndex + 1 : index + 1} /{' '}
            {caseCount || item.images.length}
          </span>
          <button
            aria-label={caseCount ? 'Próximo caso' : 'Próxima imagem'}
            disabled={
              caseCount ? !onNextCase : index === item.images.length - 1
            }
            onClick={
              caseCount && onNextCase
                ? onNextCase
                : () =>
                    setIndex((value) =>
                      Math.min(item.images.length - 1, value + 1),
                    )
            }
          >
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
      <aside className="integration-card" aria-label="Integração da imagem com o Atlas">
        <strong><ScanLine size={16} /> {integration.title}</strong>
        <p>{integration.description}</p>
        <div><button onClick={onLocate}>Mostrar região no Atlas</button>{onOpenDicom && <button onClick={onOpenDicom}>{integration.mode === 'dicom' ? 'Carregar 3D deste exame' : 'Abrir DICOM local / 3D do exame'}</button>}</div>
        <details><summary>Como o aplicativo escolhe a integração?</summary><p>A classificação usa os arquivos disponíveis neste caso. Uma sequência só é tratada como cortes quando sua ordem de aquisição foi verificada. Datas diferentes, modalidades diferentes ou várias imagens não comprovam uma série. Para posicionamento espacial das fatias, são necessárias posição, orientação e espaçamento DICOM. Isso não cria uma segmentação de órgãos.</p></details>
      </aside>
      {integration.mode === 'sequence' && <label className="sequence-navigation">Corte {index + 1} de {item.images.length}<input aria-label="Corte da sequência" type="range" min={0} max={item.images.length - 1} value={index} onChange={e => {setIndex(Number(e.target.value));setZoom(1)}} /></label>}
      <div className="case-layout">
        <div className="case-media" hidden={panel === 'questions'}>
          <div
            role={fullscreen ? 'dialog' : undefined}
            aria-modal={fullscreen ? true : undefined}
            aria-label={fullscreen ? 'Imagem ampliada' : undefined}
            className={'radiograph' + (fullscreen ? ' is-fullscreen' : '')}
          >
            <img
              src={image.src}
              alt={`${item.modality}: ${image.label}. Caso ${item.id}, ${item.author}, Radiopaedia.org.`}
              style={{
                transform: `scale(${zoom})`,
                filter: `contrast(${contrast}%) brightness(${brightness}%)`,
              }}
            />
            <span>{image.label}</span>
            <button
              title="Restaurar imagem"
              aria-label="Restaurar imagem"
              onClick={() => {
                setZoom(1);
                setContrast(100);
                setBrightness(100);
              }}
            >
              <RotateCcw size={17} />
            </button>
            <button
              className="expand-image"
              title={fullscreen ? 'Sair da tela cheia' : 'Ampliar imagem'}
              aria-label={fullscreen ? 'Sair da tela cheia' : 'Ampliar imagem'}
              onClick={() => setFullscreen((value) => !value)}
            >
              <Expand size={17} />
            </button>
          </div>
          <div className="image-options">
            {item.images.map((im, i) => (
              <button
                key={im.src}
                className={index === i ? 'selected' : ''}
                onClick={() => {
                  setIndex(i);
                  setZoom(1);
                }}
              >
                {im.label}
              </button>
            ))}
          </div>
          <div className="image-sliders">
            <label>
              Zoom{' '}
              <Slider
                aria-label="Zoom da imagem"
                min={1}
                max={3}
                step={0.1}
                value={[zoom]}
                onValueChange={(v) => setZoom(Array.isArray(v) ? v[0] : v)}
              />
            </label>
            <label>
              Contraste{' '}
              <Slider
                aria-label="Contraste da imagem"
                min={50}
                max={200}
                value={[contrast]}
                onValueChange={(v) => setContrast(Array.isArray(v) ? v[0] : v)}
              />
            </label>
            <label>
              Brilho{' '}
              <Slider
                aria-label="Brilho da imagem"
                min={50}
                max={180}
                value={[brightness]}
                onValueChange={(v) =>
                  setBrightness(Array.isArray(v) ? v[0] : v)
                }
              />
            </label>
          </div>
          <p className="image-note">
            Imagem JPEG de ensino. Brilho e contraste não equivalem a
            janelamento DICOM.
          </p>
          <p className="attribution">
            Caso cortesia de {item.author},{' '}
            <a href="https://radiopaedia.org" target="_blank" rel="noreferrer">
              Radiopaedia.org
            </a>
            .{' '}
            <a href={item.source} target="_blank" rel="noreferrer">
              rID: {item.id}
            </a>{' '}
            ·{' '}
            <a
              href="https://radiopaedia.org/licence"
              target="_blank"
              rel="noreferrer"
            >
              Licença: uso não comercial com atribuição
            </a>
            .
          </p>
        </div>
        <div className="case-reasoning" hidden={panel === 'images'}>
          <div className="eyebrow teal">PENSE ANTES DE REVELAR</div>
          <h3>{item.question}</h3>
          <div className="quiz">
            {item.options.map((o, i) => (
              <button
                key={o}
                className={
                  answer === i
                    ? i === item.correct
                      ? 'correct'
                      : 'incorrect'
                    : ''
                }
                onClick={() => setAnswer(i)}
              >
                {String.fromCharCode(65 + i)}. {o}
                {answer === i && i === item.correct && <Check size={16} />}
              </button>
            ))}
          </div>
          {answer !== null && (
            <div role="status" className="answer">
              <strong>
                {answer === item.correct
                  ? 'Boa correlação.'
                  : 'Reveja a correlação anatômica.'}
              </strong>
              <p>{item.explanation}</p>
            </div>
          )}
          <button
            className="secondary-button"
            onClick={() => setReveal(!reveal)}
          >
            {reveal ? 'Ocultar discussão' : 'Revelar achados e discussão'}
          </button>
          {reveal && (
            <div className="findings">
              <h3>Achados da fonte</h3>
              <p>{item.findings}</p>
              <small>{item.certainty}</small>
              <p>
                {period <= 2
                  ? 'Foco básico: nomeie a estrutura e identifique a lateralidade.'
                  : period <= 4
                    ? 'Foco intermediário: descreva modalidade, plano e alteração antes de formular a hipótese.'
                    : period <= 8
                      ? 'Foco clínico: integre cronologia, sinais e diferenciais; não conclua apenas pela imagem selecionada.'
                      : 'Foco de internato: formule uma síntese do caso e discuta decisões com supervisão e protocolos vigentes.'}
              </p>
            </div>
          )}
          <button className="primary" onClick={onLocate}>
            <ScanLine size={17} /> Localizar no corpo 3D
          </button>
          <p className="image-note">{item.regionLabel}</p>
        </div>
      </div>
    </section>
  );
}
