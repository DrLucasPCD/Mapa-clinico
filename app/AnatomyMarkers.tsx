import type { CSSProperties, RefObject } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import './anatomy-markers.css';

export type AnatomyMarker = {
  id: string;
  name: string;
  short?: string;
  color?: string;
};

export default function AnatomyMarkers({
  points,
  active,
  elements,
  onSelect,
  onClose,
  onDetails,
}: {
  points: readonly AnatomyMarker[];
  active: string;
  elements: RefObject<Map<string, HTMLDivElement>>;
  onSelect: (id: string, name: string) => void;
  onClose: () => void;
  onDetails?: () => void;
}) {
  return (
    <div className="anatomy-markers" aria-label="Marcadores anatômicos">
      {points.map(({ id, name, short, color }) => (
        <div
          key={id}
          hidden
          ref={(node) => {
            if (node) elements.current.set(id, node);
            else elements.current.delete(id);
          }}
          className={'anatomy-marker' + (active === id ? ' is-active' : '')}
          style={{ '--marker-color': color ?? '#14b8a6' } as CSSProperties}
        >
          <button
            className="anatomy-marker-point"
            type="button"
            aria-label={'Identificar ' + name}
            aria-expanded={active === id}
            title={name}
            onClick={() => onSelect(id, name)}
          />
          {active === id && (
            <div className="anatomy-marker-card" aria-label={name}>
              <button
                className="anatomy-marker-close"
                type="button"
                onClick={() => {
                  onClose();
                  elements.current
                    .get(id)
                    ?.querySelector('button')
                    ?.focus({ preventScroll: true });
                }}
                aria-label="Fechar identificação"
              >
                <X size={14} />
              </button>
              <strong>{name}</strong>
              {short && <p>{short}</p>}
              {onDetails && (
                <button
                  className="anatomy-marker-more"
                  type="button"
                  onClick={onDetails}
                >
                  Ver ficha <ArrowUpRight size={13} />
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
