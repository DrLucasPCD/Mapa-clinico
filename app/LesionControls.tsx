import type { useLesionStudy } from './useLesionStudy';

type Props = { study: ReturnType<typeof useLesionStudy> };

export default function LesionControls({ study }: Props) {
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
        {study.imported.length > 0 && (
          <label>
            Região
            <select
              value={study.selection}
              onChange={(event) => study.select(event.currentTarget.value)}
            >
              <option value="manual">Marcação manual</option>
              {study.imported.map((segment) => (
                <option key={segment.id} value={segment.id}>
                  {segment.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {!study.editing && (
          <small>
            Segmentação importada · {study.mask.size}{' '}
            {study.mask.size === 1 ? 'corte marcado' : 'cortes marcados'}
          </small>
        )}
      </div>
      {study.editing && (
        <div className="lesion-actions">
          <div
            className="lesion-modes"
            role="group"
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
          </div>
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
      )}
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
