import * as T from 'three';
import type { CardiacMotion, Valve } from './heart-cycle';
import type { HeartRig } from './heart-motion';
import { atrialInlets } from './heart-model';
import { vesselPaths } from './heart-vessel-path';

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
  const pathsFor = (id: string, toward: T.Vector3, returning = false) => {
    const mesh = model.children.find(
      (part): part is T.Mesh =>
        part instanceof T.Mesh && part.userData.anatomyId === id,
    );
    return mesh ? vesselPaths(mesh, [toward], returning) : [];
  };
  function particles(radius: number, oxygenated: boolean, count: number) {
    const dots = new T.InstancedMesh(
      new T.SphereGeometry(radius, 8, 6),
      new T.MeshBasicMaterial({
        color: oxygenated ? '#ff806b' : '#64c9ff',
        depthTest: false,
        depthWrite: false,
        transparent: true,
        opacity: 0.91,
      }),
      count,
    );
    dots.renderOrder = 4;
    dots.frustumCulled = false;
    dots.visible = false;
    group.add(dots);
    return dots;
  }
  const routes = (Object.keys(valveIds) as Valve[]).flatMap((name) => {
    const inlet = name === 'mitral' || name === 'tricuspid';
    const left = name === 'mitral' || name === 'aortic';
    const ventricle = left ? 'left-ventricle' : 'right-ventricle';
    const chamber = center(ventricle);
    const gate = center(valveIds[name]);
    const vessel = left ? vesselIds[0] : vesselIds[1];
    const tail =
      !inlet && gate
        ? pathsFor(vessel, gate).sort(
            (a, b) =>
              a.points[0].distanceToSquared(gate) -
              b.points[0].distanceToSquared(gate),
          )[0]
        : undefined;
    const end = inlet ? chamber : tail?.getPointAt(0.12);
    const start = inlet
      ? center(left ? 'left-atrium' : 'right-atrium')
      : chamber;
    if (!end || !start || !gate) return [];
    const curve = new T.CatmullRomCurve3([start, gate, end]);
    const dots = particles(0.00128, left, 9);
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
  const conduitSpecs = [
    ...atrialInlets.map(({ id, atrium }) => ({
      id,
      parent: atrium,
      returning: true,
      oxygenated: atrium === 'left-atrium',
    })),
    {
      id: 'ascending-aorta',
      parent: valveIds.aortic,
      returning: false,
      oxygenated: true,
    },
    {
      id: 'aortic-arch',
      parent: 'ascending-aorta',
      returning: false,
      oxygenated: true,
    },
    {
      id: 'pulmonary-trunk',
      parent: valveIds.pulmonary,
      returning: false,
      oxygenated: false,
    },
    {
      id: 'bifurcation-of-pulmonary-trunk',
      parent: 'pulmonary-trunk',
      returning: false,
      oxygenated: false,
    },
    {
      id: 'right-pulmonary-artery',
      parent: 'bifurcation-of-pulmonary-trunk',
      returning: false,
      oxygenated: false,
    },
    {
      id: 'left-pulmonary-artery',
      parent: 'bifurcation-of-pulmonary-trunk',
      returning: false,
      oxygenated: false,
    },
  ];
  const conduits = conduitSpecs.flatMap(
    ({ id, parent, returning, oxygenated }) => {
      const from = center(parent);
      if (!from) return [];
      const guides = pathsFor(id, from, returning);
      if (returning) {
        const attached = guides.sort(
          (a, b) =>
            a.points.at(-1)!.distanceToSquared(from) -
            b.points.at(-1)!.distanceToSquared(from),
        )[0];
        if (attached) {
          attached.points.push(from);
          attached.updateArcLengths();
        }
      }
      return guides.map((guide) => ({
        id,
        guide,
        length: guide.getLength(),
        dots: particles(0.00115, oxygenated, 7),
        returning,
      }));
    },
  );
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
    showChambers: boolean,
    showGreatVessels: boolean,
    showVectors: boolean,
    time: number,
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
        showChambers &&
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
    for (const { id, returning, guide, length, dots } of conduits) {
      dots.visible = showGreatVessels;
      if (!dots.visible) continue;
      const phase = motion.seconds / motion.period;
      const pace = returning ? 0.1 : 0.15;
      const pulse =
        ((0.3 * motion.period) / (2 * Math.PI)) *
        Math.sin(2 * Math.PI * (phase - 0.19));
      for (let i = 0; i < dots.count; i++) {
        const position =
          (((time + pulse) * pace) / length + i / dots.count) % 1;
        const progress = (position + 1) % 1;
        guide.getPointAt(progress, point);
        rig.point(id, point, motion, transform.position);
        transform.updateMatrix();
        dots.setMatrixAt(i, transform.matrix);
      }
      dots.instanceMatrix.needsUpdate = true;
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
