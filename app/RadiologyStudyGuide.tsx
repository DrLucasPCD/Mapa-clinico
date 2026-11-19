const windows = {
  lung: { label: 'Pulmão', center: -600, width: 1500 },
  mediastinum: { label: 'Mediastino', center: 40, width: 350 },
  bone: { label: 'Osso', center: 450, width: 1800 },
} as const;

export default function RadiologyStudyGuide({
  ct,
  onWindow,
}: {
  ct: boolean;
  onWindow: (center: number, width: number) => void;
}) {
  return (
    <details className="rad-study-guide">
      <summary>Roteiro de leitura radiológica</summary>
      <p>
        Antes de marcar, identifique a modalidade, a sequência ou fase de
        contraste e o plano. Localize o achado por lado, compartimento e relação
        com estruturas vizinhas. Percorra os cortes contíguos e confira o
        contorno em outro plano.
      </p>
      {ct && (
        <>
          <div
            className="image-tools"
            role="group"
            aria-label="Janelas de exibição da TC"
          >
            {Object.values(windows).map(({ label, center, width }) => (
              <button key={label} onClick={() => onWindow(center, width)}>
                Janela de {label.toLowerCase()}
              </button>
            ))}
          </div>
          <dl>
            <dt>Nódulo ou massa pulmonar</dt>
            <dd>
              Delimite a opacidade na janela pulmonar. Compare com a janela
              mediastinal para observar calcificações, gordura e continuidade
              com vasos.
            </dd>
            <dt>Consolidação e atelectasia</dt>
            <dd>
              Uma opacidade ganha contexto quando você observa o volume do lobo.
              Deslocamento de fissuras, aproximação de vasos ou tração de
              estruturas adjacentes ajudam a reconhecer perda de volume.
            </dd>
            <dt>Derrame pleural e pneumotórax</dt>
            <dd>
              Localize líquido ou ar no espaço pleural. Confira os limites em
              outro plano antes de incluir pulmão adjacente, parede torácica ou
              líquido de outro compartimento.
            </dd>
            <dt>Mediastino e abdome</dt>
            <dd>
              Use vasos e órgãos como referências de posição. Confira a
              continuidade com estruturas vizinhas e o padrão de realce na fase
              de contraste disponível.
            </dd>
          </dl>
        </>
      )}
      {!ct && (
        <p>
          Na RM, compare a região em sequências disponíveis do mesmo estudo.
          Revise se o limite persiste em planos adjacentes e se as séries têm
          geometria correspondente antes de comparar posições.
        </p>
      )}
      <small>
        Roteiro autoral baseado nos temas das aulas e questões de Introdução à
        Radiologia.
      </small>
    </details>
  );
}
