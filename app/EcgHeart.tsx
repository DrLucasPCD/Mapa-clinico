import { useState, type RefCallback } from 'react';
import Lab3dScene from './Lab3dScene';
import HeartFlowControls from './HeartFlowControls';
import { labLayers, type LabCamera } from './lab3d-data';
import { type HeartFlowOptions } from './heart-coronary-flow';
import {
  ecgLeads,
  type ConductionStage,
  type LeadId,
  type Vector,
} from './ecg-model';
import type { CardiacMotion } from './heart-cycle';

type Props = {
  vector: Vector;
  lead: LeadId;
  visibleLeads: readonly LeadId[];
  time: number;
  motion: CardiacMotion;
  stage: ConductionStage | null;
  showConduction: boolean;
  flowPanel: RefCallback<HTMLDetailsElement>;
  onSelectLead: (id: LeadId) => void;
};

const layers = labLayers.heart.map((layer) => layer.id);
const noop = () => {};
const cameraOptions = [
  ['frontal', 'Frontal'],
  ['superior', 'Superior'],
  ['oblique', 'Oblíqua'],
] as const;

export default function EcgHeart({
  time,
  vector,
  stage,
  motion,
  lead,
  visibleLeads,
  showConduction,
  onSelectLead,
  flowPanel,
}: Props) {
  const [flow, setFlow] = useState<HeartFlowOptions>({
    chambers: false,
    greatVessels: false,
    arteries: false,
    veins: false,
  });
  const [branch, setBranch] = useState('all');
  const [preset, setPreset] = useState<{ camera: LabCamera; key: number }>();
  const plane = ecgLeads[lead].plane;
  const preferred =
    visibleLeads.length === 0
      ? 'frontal'
      : visibleLeads.some((id) => ecgLeads[id].plane !== plane)
        ? 'oblique'
        : plane === 'frontal'
          ? 'frontal'
          : 'superior';
  return (
    <>
      <div className="ecg-heart">
        <div className="ecg-heart-view">
          <Lab3dScene
            scope="heart"
            molecule="dopamina"
            layers={layers}
            view={showConduction ? 'ghost' : 'natural'}
            spread={0}
            cut={0}
            axis="coronal"
            selected=""
            focus={0}
            camera={preset?.camera ?? preferred}
            cameraReset={preset?.key ?? 0}
            lookAtLesion={false}
            pointCloud={false}
            showHydrogen={false}
            flow={flow}
            coronaryBranch={branch}
            electrical={{
              lead,
              visibleLeads,
              showConduction,
              onSelectLead,
              external: { time, vector, stage, motion },
            }}
            stage={0}
            progress={0}
            playing={false}
            bpm={60 / motion.period}
            lockedCamera={false}
            vectors={false}
            chamberView="all"
            onSelect={noop}
            onParts={noop}
          />
        </div>
        <div className="ecg-heart-controls" aria-label="Orientação da câmera">
          {cameraOptions.map(([camera, label]) => (
            <button
              type="button"
              key={camera}
              onClick={() =>
                setPreset((previous) => ({
                  camera,
                  key: (previous?.key ?? 0) + 1,
                }))
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <details className="ecg-heart-flow" ref={flowPanel}>
        <summary>Fluxo no coração 3D</summary>
        <HeartFlowControls
          flow={flow}
          setFlow={setFlow}
          branch={branch}
          setBranch={setBranch}
        />
      </details>
    </>
  );
}
