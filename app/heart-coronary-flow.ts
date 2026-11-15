import * as T from 'three';
import { coronaryArteries, coronaryVeins } from './heart-model';
import type { CardiacMotion } from './heart-cycle';
import type { HeartRig } from './heart-motion';
import { vesselPaths } from './heart-vessel-path';

export type HeartFlowOptions = {
  chambers: boolean;
  greatVessels: boolean;
  arteries: boolean;
  veins: boolean;
};
export const defaultHeartFlow: HeartFlowOptions = {
  chambers: true,
  greatVessels: false,
  arteries: false,
  veins: false,
};

export function makeCoronaryFlow(rig: HeartRig, model: T.Group) {
  const group = new T.Group();
  const guides = new Map<string, T.Vector3[]>();
  const origin = rig.centers.get('ascending-aorta');
  const valve = rig.centers.get('right-coronary-leaflet');
  if (origin && valve)
    guides.set('ascending-aorta', [valve, origin.clone().lerp(valve, 0.65)]);
  const rightAtrium = rig.centers.get('right-atrium');
  if (rightAtrium) guides.set('right-atrium', [rightAtrium]);

  const marker = new T.Object3D();
  const point = new T.Vector3();
  function build(
    spec: (typeof coronaryArteries)[number] | (typeof coronaryVeins)[number],
    venous: boolean,
  ) {
    const mesh = model.children.find(
      (part): part is T.Mesh =>
        part instanceof T.Mesh && part.userData.anatomyId === spec.id,
    );
    const parent =
      guides.get(spec.parent) ??
      (rig.centers.get(spec.parent) ? [rig.centers.get(spec.parent)!] : []);
    if (!mesh || parent.length === 0) return [];
    const curves = vesselPaths(mesh, parent, venous);
    guides.set(
      spec.id,
      curves.flatMap((curve) => curve.getSpacedPoints(24)),
    );
    return curves.map((curve) => {
      const length = curve.getLength();
      const count = Math.max(3, Math.min(14, Math.round(length / 0.005)));
      const radius = spec.id.startsWith('septal-') ? 0.0005 : 0.00078;
      const dots = new T.InstancedMesh(
        new T.SphereGeometry(radius, 7, 5),
        new T.MeshBasicMaterial({
          color: venous ? '#ba9dff' : '#ffac55',
          transparent: true,
          opacity: 0.92,
          depthTest: false,
          depthWrite: false,
        }),
        count,
      );
      dots.renderOrder = 5;
      dots.visible = false;
      dots.frustumCulled = false;
      group.add(dots);
      return { id: spec.id, curve, length, count, dots, venous };
    });
  }
  const routes = [
    ...coronaryArteries.flatMap((item) => build(item, false)),
    ...coronaryVeins.flatMap((item) => build(item, true)),
  ];
  function update(
    motion: CardiacMotion,
    time: number,
    arteries: boolean,
    veins: boolean,
    branch: string,
    stage: number,
    treatment: number,
  ) {
    for (const { id, curve, length, count, dots, venous } of routes) {
      dots.visible = venous
        ? veins
        : arteries && (branch === 'all' || branch === id);
      if (!dots.visible) continue;
      // The cyclic term modulates speed continuously. Its derivative stays positive
      // and is lower during ventricular systole, particularly on the left.
      const amplitude = venous
        ? 0.18
        : id.includes('right-coronary')
          ? 0.35
          : 0.58;
      const cycleTerm =
        ((amplitude * motion.period) / (2 * Math.PI)) *
        Math.sin(2 * Math.PI * (motion.seconds / motion.period - 0.25));
      const lesion =
        id === 'anterior-interventricular-artery' && stage > 0
          ? 1 - treatment
          : 0;
      const pace = (venous ? 0.034 : 0.045) * (1 - 0.42 * lesion);
      dots.count = Math.max(2, Math.round(count * (1 - 0.38 * lesion)));
      for (let i = 0; i < dots.count; i++) {
        const progress =
          (((time - cycleTerm) * pace) / length + i / dots.count) % 1;
        curve.getPointAt((progress + 1) % 1, point);
        rig.point(id, point, motion, marker.position);
        marker.updateMatrix();
        dots.setMatrixAt(i, marker.matrix);
      }
      dots.instanceMatrix.needsUpdate = true;
    }
  }
  return { group, update };
}
