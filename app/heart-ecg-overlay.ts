import * as T from 'three';
import { heartChambers } from './heart-model';
import {
  ecgLeads,
  frontalLeads,
  rightLeads,
  posteriorLeads,
  type ConductionStage,
  type LeadId,
  type Vector,
} from './ecg-model';
import { conductionNodes, conductionPaths } from './ecg-conduction';
import type { CardiacMotion } from './heart-cycle';
import type { HeartRig } from './heart-motion';

export type HeartElectricalOptions = {
  lead: LeadId;
  visibleLeads: readonly LeadId[];
  showConduction: boolean;
  onSelectLead: (id: LeadId) => void;
  external?: {
    time: number;
    motion: CardiacMotion;
    vector: Vector;
    stage: ConductionStage | null;
  };
};
const toWorld = ([left, inferior, anterior]: Vector) =>
  new T.Vector3(left, -inferior, anterior);
const allLeads = Object.keys(ecgLeads) as LeadId[];
export const leadColor = (lead: LeadId) => {
  if (frontalLeads.some((id) => id === lead)) return 0x73ccef;
  if (rightLeads.some((id) => id === lead)) return 0xf6ae82;
  if (posteriorLeads.some((id) => id === lead)) return 0xbfa8fc;
  return 0x82e0bf;
};

export function makeHeartElectrical(model: T.Group, rig: HeartRig) {
  const group = new T.Group();
  const box = new T.Box3();
  for (const child of model.children) {
    if (
      heartChambers.includes(
        String(child.userData.anatomyId).replaceAll('-', '_'),
      )
    )
      box.expandByObject(child);
  }
  box.getCenter(group.position);
  group.scale.setScalar(box.getSize(new T.Vector3()).length() / 2.1);
  const ringGeometry = new T.RingGeometry(1.32, 1.326, 80);
  const frontalRing = new T.Mesh(
    ringGeometry,
    new T.MeshBasicMaterial({ color: '#51758c', side: T.DoubleSide }),
  );
  const horizontalRing = new T.Mesh(
    ringGeometry,
    new T.MeshBasicMaterial({ color: '#496e69', side: T.DoubleSide }),
  );
  horizontalRing.rotation.x = Math.PI / 2;
  group.add(frontalRing, horizontalRing);
  const origin = new T.Vector3();
  const negative = new T.ArrowHelper(
    new T.Vector3(-1, 0, 0),
    origin,
    1.2,
    0x547185,
    0.1,
    0.064,
  );
  const electric = new T.ArrowHelper(
    new T.Vector3(1, 0, 0),
    origin,
    0.75,
    0xffcd74,
    0.16,
    0.1,
  );
  const leadArrows = allLeads.map((id, index) => {
    const axis = toWorld(ecgLeads[id].axis);
    const length = index % 2 === 0 ? 1.48 : 1.72;
    const arrow = new T.ArrowHelper(
      axis,
      origin,
      length,
      leadColor(id),
      0.12,
      0.065,
    );
    const labelPoint = axis.clone().multiplyScalar(length + 0.15);
    return { id, arrow, labelPoint, length };
  });
  for (const arrow of [
    negative,
    electric,
    ...leadArrows.map((item) => item.arrow),
  ]) {
    for (const material of [arrow.line.material, arrow.cone.material].flat())
      material.depthTest = false;
    arrow.line.renderOrder = 2;
    arrow.cone.renderOrder = 2;
    group.add(arrow);
  }
  const pathGeometry = new T.SphereGeometry(0.044, 14, 10);
  const trailMaterial = new T.MeshBasicMaterial({
    color: '#45d5e6',
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const frontMaterial = new T.MeshBasicMaterial({
    color: '#ffdc86',
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const pathways = conductionPaths.map((path) => {
    const curve = new T.CatmullRomCurve3(
      path.points.map((point) => new T.Vector3(...point)),
    );
    const tube = new T.TubeGeometry(curve, 30, 0.016, 6, false);
    const trail = new T.Mesh(tube, trailMaterial);
    const front = new T.Mesh(pathGeometry, frontMaterial);
    trail.renderOrder = 4;
    front.renderOrder = 5;
    group.add(trail, front);
    return { step: path.step, curve, trail, front, count: tube.index!.count };
  });
  const nodes = conductionNodes.map((node) => {
    const mesh = new T.Mesh(pathGeometry, frontMaterial);
    mesh.position.fromArray(node.point);
    mesh.renderOrder = 5;
    group.add(mesh);
    return { ...node, mesh };
  });

  let leadVisibility = '';
  const projected = new T.Vector3();
  const pulsePoint = new T.Vector3();
  function attach(
    point: T.Vector3,
    step: number,
    motion: CardiacMotion,
    target: T.Vector3,
  ) {
    const region = step <= 2 ? 'right-atrium' : 'left-ventricle';
    point.multiplyScalar(group.scale.x).add(group.position);
    rig.point(region, point, motion, target);
    target.sub(group.position).divideScalar(group.scale.x);
  }
  function update(
    next: HeartElectricalOptions,
    vectorValue: Vector,
    activeStage: ConductionStage | null,
    motion: CardiacMotion,
  ) {
    const visibility = next.visibleLeads.join(',') + ':' + next.lead;
    if (leadVisibility !== visibility) {
      leadVisibility = visibility;
      frontalRing.visible = next.visibleLeads.some(
        (id) => ecgLeads[id].plane === 'frontal',
      );
      horizontalRing.visible = next.visibleLeads.some(
        (id) => ecgLeads[id].plane === 'horizontal',
      );
      negative.visible = next.visibleLeads.length === 1;
      negative.setDirection(toWorld(ecgLeads[next.lead].axis).negate());
      for (const { id, arrow, length } of leadArrows) {
        arrow.visible = next.visibleLeads.includes(id);
        arrow.setColor(
          new T.Color(id === next.lead ? '#ffffff' : leadColor(id)),
        );
        arrow.setLength(
          length,
          id === next.lead ? 0.18 : 0.12,
          id === next.lead ? 0.1 : 0.065,
        );
      }
    }
    const vector = toWorld(vectorValue);
    const length = vector.length();
    electric.visible = next.visibleLeads.length > 0 && length > 0.024;
    if (electric.visible) {
      electric.setDirection(vector.normalize());
      electric.setLength(
        Math.min(1.25, length * 1.24),
        Math.min(0.16, length * 0.7),
        Math.min(0.1, length * 0.4),
      );
    }
    const stage = next.showConduction ? activeStage : null;
    for (const { step, curve, trail, front, count } of pathways) {
      trail.visible = Boolean(
        stage && stage.index >= step && (!stage.ventricularOnly || step >= 3),
      );
      front.visible = trail.visible && stage?.index === step;
      if (stage && trail.visible) {
        const fraction = stage.index > step ? 1 : stage.progress;
        trail.geometry.setDrawRange(
          0,
          Math.floor((fraction * count) / 36) * 36,
        );
        if (front.visible)
          attach(
            curve.getPointAt(fraction, pulsePoint),
            step,
            motion,
            front.position,
          );
      }
    }
    for (const { mesh, step, point } of nodes) {
      mesh.visible = Boolean(
        stage && !stage.ventricularOnly && stage.index >= step,
      );
      if (mesh.visible)
        attach(pulsePoint.fromArray(point), step, motion, mesh.position);
      mesh.material = stage?.index === step ? frontMaterial : trailMaterial;
      mesh.scale.setScalar(
        stage?.index === step
          ? 1.1 + 0.55 * Math.sin(stage.progress * Math.PI)
          : 0.8,
      );
    }
  }
  function placeLabels(
    camera: T.Camera,
    width: number,
    height: number,
    labels: ReadonlyMap<LeadId, HTMLButtonElement>,
  ) {
    const positions = leadArrows.flatMap(({ id, labelPoint }) => {
      const label = labels.get(id);
      if (!label) return [];
      label.hidden = !group.visible;
      if (label.hidden) return [];
      group.localToWorld(projected.copy(labelPoint)).project(camera);
      return [
        {
          label,
          x: ((projected.x + 1) * width) / 2,
          y: ((1 - projected.y) * height) / 2,
        },
      ];
    });
    // Keep nearby labels readable when the two planes overlap on screen.
    for (let pass = 0; pass < 5; pass += 1) {
      positions.forEach((point, i) => {
        for (const other of positions.slice(i + 1)) {
          if (
            Math.abs(point.x - other.x) >= 34 ||
            Math.abs(point.y - other.y) >= 20
          )
            continue;
          const shift = (20 - Math.abs(point.y - other.y)) / 2;
          const direction = point.y > other.y ? 1 : -1;
          point.y += direction * shift;
          other.y -= direction * shift;
        }
      });
    }
    for (const { label, x, y } of positions) {
      label.style.left = `${Math.max(18, Math.min(width - 18, x))}px`;
      label.style.top = `${Math.max(13, Math.min(height - 36, y))}px`;
    }
  }
  return { group, update, placeLabels };
}
