import { coronaryArteries } from './heart-model';
import type { HeartFlowOptions } from './heart-coronary-flow';

const circuits: { id: keyof HeartFlowOptions; label: string }[] = [
  { id: 'chambers', label: 'Câmaras e valvas' },
  { id: 'greatVessels', label: 'Grandes vasos' },
  { id: 'arteries', label: 'Artérias coronárias' },
  { id: 'veins', label: 'Drenagem coronária' },
];

export default function HeartFlowControls({
  flow,
  setFlow,
  branch,
  setBranch,
}: {
  flow: HeartFlowOptions;
  setFlow: (value: HeartFlowOptions) => void;
  branch: string;
  setBranch: (id: string) => void;
}) {
  return (
    <fieldset className="heart-flow-controls">
      <legend>Fluxo sanguíneo</legend>
      {circuits.map(({ id, label }) => (
        <label key={id} className={`heart-flow-option flow-${id}`}>
          <input
            type="checkbox"
            checked={flow[id]}
            onChange={(event) =>
              setFlow({ ...flow, [id]: event.target.checked })
            }
          />
          <i aria-hidden="true" />
          {label}
        </label>
      ))}
      {flow.arteries && (
        <label className="heart-flow-branch">
          Ramo coronário
          <select
            value={branch}
            onChange={(event) => setBranch(event.target.value)}
          >
            <option value="all">Todas as artérias</option>
            {coronaryArteries.map(({ id, label }) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
      )}
      <small>Trajetos didáticos nas estruturas do modelo.</small>
    </fieldset>
  );
}
