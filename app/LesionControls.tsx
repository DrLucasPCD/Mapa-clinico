import { useState } from 'react';
import type { useLesionStudy } from './useLesionStudy';

type Props = {
  study: ReturnType<typeof useLesionStudy>;
  slice: number;
  total: number;
  onSlice: (index: number) => void;
  canExport: boolean;
};

export default function LesionControls({
  study,
  slice,
  total,
  onSlice,
  canExport,
}: Props) {
  const [copies, setCopies] = useState(1);
  const reviewIndex =
    study.pending.find((index) => index > slice) ?? study.pending[0];
  const working = study.importing || study.exporting;
  return (
    <section
      className="lesion-controls"
      aria-label="Marcação e reconstrução de lesões"
    >
      <div>
        <h4>Lesão no exame · 2D e 3D</h4>
        <p>
          Importe uma máscara DICOM SEG binária da mesma série ou delimite a
          região corte a corte. O modelo usa os voxels marcados.
        </p>
      </div>
      <div className="lesion-actions">
        <label className="lesion-upload">
          {study.importing ? 'Verificando máscara…' : 'Importar DICOM SEG'}
          <input
            type="file"
            aria-label="Importar máscara DICOM SEG"
            disabled={study.importing}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) void study.importFile(file);
              event.currentTarget.value = '';
            }}
          />
        </label>
        <button
          onClick={() => void study.exportFile()}
          disabled={working || !study.hasMasks || !canExport}
        >
          Exportar DICOM SEG
        </button>
        <button onClick={study.add} disabled={working}>
          Nova região
        </button>
      </div>
      {!canExport && (
        <small>
          A exportação requer os identificadores originais da série DICOM.
        </small>
      )}
      <fieldset disabled={working} className="lesion-editor">
        <div className="lesion-actions">
          <label>
            Região
            <select
              value={study.region.id}
              onChange={(event) => study.select(event.target.value)}
            >
              {study.regions.map((region, i) => (
                <option key={region.id} value={region.id}>
                  {region.label.trim() || `Lesão ${i + 1}`}
                </option>
              ))}
            </select>
          </label>
          <label>
            Nome da região
            <input
              maxLength={45}
              value={study.region.label}
              onChange={(event) => study.rename(event.target.value)}
            />
          </label>
        </div>
        <div className="lesion-actions">
          <fieldset
            className="lesion-modes"
            aria-label="Ferramenta de marcação"
          >
            <button
              aria-pressed={study.tool === 'navigate'}
              onClick={() => study.setTool('navigate')}
            >
              Navegar
            </button>
            <button
              aria-pressed={study.tool === 'paint'}
              onClick={() => study.setTool('paint')}
            >
              Pincel
            </button>
            <button
              aria-pressed={study.tool === 'erase'}
              onClick={() => study.setTool('erase')}
            >
              Borracha
            </button>
          </fieldset>
          {study.tool !== 'navigate' && (
            <label className="lesion-radius">
              Raio {study.radius} mm
              <input
                type="range"
                aria-label="Raio do pincel em milímetros"
                min="1"
                max="20"
                step="1"
                value={study.radius}
                onChange={(event) =>
                  study.setRadius(event.currentTarget.valueAsNumber)
                }
              />
            </label>
          )}
          <button disabled={!study.canUndo} onClick={study.undo}>
            Desfazer
          </button>
          <button disabled={!study.mask.size} onClick={study.clear}>
            Limpar marcação
          </button>
        </div>
        {study.mask.size > 0 && (
          <div className="lesion-review">
            <div className="lesion-actions">
              <strong>
                Corte adquirido {slice + 1} / {total}
              </strong>
              <label>
                Propagar por
                <select
                  value={copies}
                  onChange={(event) => setCopies(Number(event.target.value))}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? 'corte' : 'cortes'}
                    </option>
                  ))}
                </select>
              </label>
              <button
                disabled={!study.mask.has(slice) || slice === 0}
                onClick={() => study.propagate(slice, -1, copies)}
              >
                ← Copiar para trás
              </button>
              <button
                disabled={!study.mask.has(slice) || slice === total - 1}
                onClick={() => study.propagate(slice, 1, copies)}
              >
                Copiar para frente →
              </button>
            </div>
            <small>
              O contorno é copiado para cortes vazios até encontrar um corte
              marcado. Revise o contorno em cada fatia.
            </small>
            <div className="lesion-actions">
              <button
                aria-pressed={study.region.reviewed.has(slice)}
                disabled={!study.mask.has(slice)}
                onClick={() => study.toggleReview(slice)}
              >
                {study.region.reviewed.has(slice)
                  ? '✓ Corte revisado'
                  : 'Marcar corte revisado'}
              </button>
              <button
                disabled={reviewIndex === undefined}
                onClick={() => onSlice(reviewIndex!)}
              >
                Ir para corte pendente
              </button>
              <label>
                Ir para corte marcado
                <select
                  value={study.mask.has(slice) ? slice : ''}
                  onChange={(event) => onSlice(Number(event.target.value))}
                >
                  <option value="" disabled>
                    Escolher…
                  </option>
                  {study.marked.map((index) => (
                    <option key={index} value={index}>
                      {index + 1} ·{' '}
                      {study.region.reviewed.has(index)
                        ? 'revisado'
                        : 'pendente'}
                    </option>
                  ))}
                </select>
              </label>
              <output>
                {study.region.reviewed.size} / {study.marked.length} revisados
              </output>
            </div>
          </div>
        )}
      </fieldset>
      <div className="lesion-actions">
        {study.mask.size > 0 && (
          <label>
            <input
              type="checkbox"
              checked={study.shown}
              onChange={(event) => study.setShown(event.currentTarget.checked)}
            />{' '}
            Destacar nos cortes
          </label>
        )}
        <output>
          {study.rendering
            ? 'Reconstruindo região no espaço do exame…'
            : study.volume !== null
              ? `${study.volume.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} mL estimados · ${study.mask.size} ${study.mask.size === 1 ? 'corte da série' : 'cortes da série'}`
              : study.tool !== 'navigate'
                ? 'Arraste sobre uma imagem. Role para avançar entre os cortes.'
                : 'Escolha Pincel para começar uma marcação manual.'}
        </output>
      </div>
      {(study.error || study.surfaceError) && (
        <p role="alert" className="lesion-error">
          {[study.error, study.surfaceError].filter(Boolean).join(' ')}
        </p>
      )}
    </section>
  );
}
