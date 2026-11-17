import type { Ref, ReactNode } from 'react';

/** React owns the overlay; Three.js exclusively owns the empty surface. */
export default function AtlasSurface({
  surfaceRef,
  status,
  children,
  onRetry,
}: {
  surfaceRef: Ref<HTMLDivElement>;
  status: string;
  children?: ReactNode;
  onRetry?: () => void;
}) {
  return (
    <div className="atlas-canvas">
      <div
        className="atlas-surface"
        ref={surfaceRef}
        tabIndex={0}
        role="application"
        aria-label="Atlas anatômico 3D. Arraste para girar ou use as setas do teclado. Use mais e menos para zoom. Clique em uma estrutura para selecioná-la e clique duas vezes para aproximar o foco."
      />
      {children}
      {status ? (
        <div className="atlas-status">
          <output>{status}</output>
          {onRetry && (
            <button type="button" className="atlas-retry" onClick={onRetry}>
              Reabrir visualização 3D
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
