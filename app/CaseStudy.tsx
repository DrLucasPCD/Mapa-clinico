import { useState } from 'react';
import { ArrowUpRight, ScanLine, Check, RotateCcw } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import type { ClinicalCase } from './content';
export default function CaseStudy({
  item,
  period,
  onLocate,
}: {
  item: ClinicalCase;
  period: number;
  onLocate: () => void;
}) {
  const [index, setIndex] = useState(0),
    [zoom, setZoom] = useState(1),
    [contrast, setContrast] = useState(100),
    [brightness, setBrightness] = useState(100),
    [answer, setAnswer] = useState<number | null>(null),
    [reveal, setReveal] = useState(false);
  const image = item.images[index];
  return (
    <section className="case-detail">
      <div className="case-top">
        <span className="level-badge">
          CASO REAL · {item.modality} · rID {item.id}
        </span>
        <a href={item.source} target="_blank" rel="noreferrer">
          Caso original <ArrowUpRight size={15} />
        </a>
      </div>
      <h2>{item.title}</h2>
      <p>{item.presentation}</p>
      <div className="case-layout">
        <div>
          <div className="radiograph">
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
        <div className="case-reasoning">
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
