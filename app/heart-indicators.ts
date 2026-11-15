import * as T from 'three';
import type { CardiacMotion, Valve } from './heart-cycle';
import type { HeartRig } from './heart-motion';
import { vesselGuide } from './lab3d-geometry';

const vesselIds = ['ascending-aorta', 'pulmonary-trunk'] as const;
const valveIds = {
  mitral: 'posterior-leaflet-of-left-atrioventricular-valve',
  tricuspid: 'inferior-leaflet-of-right-atrioventricular-valve',
  aortic: 'right-coronary-leaflet',
  pulmonary: 'anterior-semilunar-leaflet-of-pulmonary-valve',
} as const;

export function makeHeartIndicators(rig: HeartRig, model: T.Group) {
  const group = new T.Group();
  const { centers, apex, axis, length } = rig;
  const point = new T.Vector3(),
    deformed = new T.Vector3(),
    dir = new T.Vector3();
  const transform = new T.Object3D();
  const center = (id: string) => centers.get(id)?.clone();
  const routes = (Object.keys(valveIds) as Valve[]).flatMap((name) => {
    const inlet = name === 'mitral' || name === 'tricuspid';
    const left = name === 'mitral' || name === 'aortic';
    const ventricle = left ? 'left-ventricle' : 'right-ventricle';
    const chamber = center(ventricle);
    const gate = center(valveIds[name]);
    const vessel = left ? vesselIds[0] : vesselIds[1];
    const mesh = model.children.find(
      (part): part is T.Mesh =>
        part instanceof T.Mesh && part.userData.anatomyId === vessel,
    );
    const tail = mesh && vesselGuide(mesh, 'y');
    const end = inlet ? chamber : tail?.getPointAt(0.9);
    const start = inlet
      ? center(left ? 'left-atrium' : 'right-atrium')
      : chamber;
    if (!end || !start || !gate) return [];
    const mid = inlet ? end.clone().lerp(gate, 0.5) : tail!.getPointAt(0.48);
    const curve = new T.CatmullRomCurve3([start, gate, mid, end]);
    const dots = new T.InstancedMesh(
      new T.SphereGeometry(0.00128, 8, 6),
      new T.MeshBasicMaterial({
        color: left ? '#ffb17c' : '#74bbff',
        depthWrite: false,
      }),
      9,
    );
    dots.frustumCulled = false;
    group.add(dots);
    return [
      {
        name,
        curve,
        dots,
        inlet,
        ventricle,
        vessel,
        atrium: left ? 'left-atrium' : 'right-atrium',
      },
    ];
  });
  const u = new T.Vector3(0, 0, 1).cross(axis).normalize();
  const v = axis.clone().cross(u);
  const markers = [0.2, 0.5, 0.78].flatMap((height) =>
    [0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((theta) => {
      const rest = apex
        .clone()
        .addScaledVector(axis, height * length)
        .addScaledVector(u, 0.34 * length * Math.cos(theta))
        .addScaledVector(v, 0.34 * length * Math.sin(theta));
      const arrow = new T.ArrowHelper(
        axis,
        rest,
        0.012,
        height === 0.2 ? 0xffb077 : 0x64f3ed,
        0.003,
        0.0021,
      );
      group.add(arrow);
      return { rest, arrow };
    }),
  );
  function update(
    motion: CardiacMotion,
    showFlow: boolean,
    showVectors: boolean,
  ) {
    for (const route of routes) {
      const openness = motion.valves[route.name];
      const travel = route.inlet ? motion.filling : motion.ejection;
      const moving = route.inlet
        ? motion.phase === 'Enchimento rápido' ||
          motion.phase === 'Diástase' ||
          motion.phase === 'Sístole atrial'
        : motion.phase === 'Ejeção ventricular';
      route.dots.visible =
        showFlow &&
        moving &&
        openness > 0.05 &&
        travel > 0.001 &&
        travel < 0.999;
      if (!route.dots.visible) continue;
      route.dots.count = Math.max(1, Math.round(9 * openness));
      for (let i = 0; i < route.dots.count; i++) {
        const progress = (travel + i / 9) % 1;
        route.curve.getPointAt(progress, point);
        const region =
          progress < 0.3
            ? route.inlet
              ? route.atrium
              : route.ventricle
            : progress < 0.58
              ? valveIds[route.name]
              : route.inlet
                ? route.ventricle
                : route.vessel;
        rig.point(region, point, motion, deformed);
        transform.position.copy(deformed);
        transform.updateMatrix();
        route.dots.setMatrixAt(i, transform.matrix);
      }
      route.dots.instanceMatrix.needsUpdate = true;
    }
    for (const { rest, arrow } of markers) {
      rig.point('left-ventricle', rest, motion, deformed);
      dir.copy(deformed).sub(rest);
      const magnitude = dir.length();
      arrow.visible = showVectors && magnitude > 0.0004;
      if (arrow.visible) {
        arrow.setDirection(dir.normalize());
        arrow.setLength(magnitude, 0.29 * magnitude, 0.19 * magnitude);
      }
    }
  }
  return { group, update };
}
