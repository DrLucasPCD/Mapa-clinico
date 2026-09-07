import type { Ref, ReactNode } from 'react';

/** React owns the overlay; Three.js exclusively owns the empty surface. */
export default function AtlasSurface({
  surfaceRef,
  status,
  children,
}: {
  surfaceRef: Ref<HTMLDivElement>;
  status: string;
  children?: ReactNode;
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
      {status ? (
        <div className="atlas-status" role="status">
          {status}
          {children}
        </div>
      ) : null}
    </div>
  );
}
