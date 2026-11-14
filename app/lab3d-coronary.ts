import * as T from 'three';
import { tube, vesselGuide } from './lab3d-geometry';

const lesionAt = 0.4;
/** Educational geometry drawn in the reference Atlas vessel coordinates. */
export function makeCoronaryDemo(anatomy: T.Group) {
  const group = new T.Group();
  const find = (id: string) =>
    anatomy.children.find(
      (mesh): mesh is T.Mesh =>
        mesh instanceof T.Mesh && mesh.userData.anatomyId === id,
    );
  const lad = find('anterior-interventricular-artery');
  const guide = lad && vesselGuide(lad, 'y', true);
  const main = find('left-coronary-artery');
  const branch = main && vesselGuide(main, 'x');
  const aorta = find('ascending-aorta');
  const root = aorta && vesselGuide(aorta, 'y', true);
  const lesion = guide?.getPointAt(lesionAt);
  let wirePath = guide;
  if (guide && branch && root) {
    const mainPoints = branch.getSpacedPoints(8);
    if (
      mainPoints[0].distanceTo(guide.getPointAt(0)) <
      mainPoints.at(-1)!.distanceTo(guide.getPointAt(0))
    )
      mainPoints.reverse();
    const aortaPoints = root.getSpacedPoints(16);
    const junction = mainPoints[0];
    const closest = aortaPoints.reduce(
      (best, p, i) =>
        p.distanceToSquared(junction) <
        aortaPoints[best].distanceToSquared(junction)
          ? i
          : best,
      0,
    );
    const points = [
      ...aortaPoints.slice(0, closest + 1),
      ...mainPoints,
      ...guide.getSpacedPoints(36),
    ].filter(
      (point, index, all) =>
        index === 0 || point.distanceToSquared(all[index - 1]) > 1e-9,
    );
    wirePath = new T.CatmullRomCurve3(points);
  }
  const reachedLesion =
    lesion && wirePath
      ? wirePath.getSpacedPoints(150).reduce(
          ({ i, d }, p, j) => {
            const distance = p.distanceToSquared(lesion);
            return distance < d ? { i: j, d: distance } : { i, d };
          },
          { i: 0, d: Infinity },
        ).i / 150
      : lesionAt;
  const otherRoutes = [
    ['ascending-aorta', false, '#ff695f', 0.09],
    ['pulmonary-trunk', false, '#64a9ff', 0.085],
    ['great-cardiac-vein', false, '#a6b2ff', 0.075],
  ] as const;
  const paths: {
    curve: T.CatmullRomCurve3;
    color: string;
    speed: number;
    id: string;
  }[] = otherRoutes.flatMap(([id, reversed, color, speed]) => {
    const mesh = find(id);
    const curve = mesh && vesselGuide(mesh, 'y', reversed);
    return curve ? [{ curve, color, speed, id }] : [];
  });
  if (guide)
    paths.push({
      curve: guide,
      color: '#ff7879',
      speed: 0.17,
      id: 'anterior-interventricular-artery',
    });
  const point = new T.Vector3();
  const cell = new T.Object3D();
  const particleSets = paths.map(({ curve, color, speed, id }) => {
    const particles = new T.InstancedMesh(
      new T.SphereGeometry(
        id === 'anterior-interventricular-artery' ? 0.00105 : 0.0018,
        8,
        6,
      ),
      new T.MeshBasicMaterial({ color, depthWrite: false }),
      24,
    );
    particles.frustumCulled = false;
    group.add(particles);
    return { curve, speed, particles, id };
  });
  const plaque = new T.Mesh(
    new T.SphereGeometry(1, 20, 16),
    new T.MeshStandardMaterial({
      color: '#f6c158',
      emissive: '#8a4a00',
      emissiveIntensity: 0.6,
      roughness: 0.42,
    }),
  );
  const balloon = new T.Mesh(
    new T.SphereGeometry(1, 18, 14),
    new T.MeshStandardMaterial({
      color: '#87eaf8',
      transparent: true,
      opacity: 0.78,
      roughness: 0.3,
      depthWrite: false,
    }),
  );
  const stent = new T.Group();
  const advance = wirePath && tube(wirePath, '#fff4ae', 0.00068, 72);
  const tip = new T.Mesh(
    new T.SphereGeometry(0.00155, 13, 10),
    new T.MeshBasicMaterial({ color: '#fffbe1' }),
  );
  const yAxis = new T.Vector3(0, 1, 0);
  if (guide && advance) {
    const tangent = guide.getTangentAt(lesionAt);
    for (const object of [plaque, balloon, stent]) {
      object.position.copy(guide.getPointAt(lesionAt));
      object.quaternion.setFromUnitVectors(yAxis, tangent);
    }
    plaque.translateX(0.00135);
    const cage = new T.BufferGeometry();
    const edges: number[] = [];
    for (let j = 0; j < 7; j++) {
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6 + (j % 2 === 0 ? 0 : Math.PI / 12);
        const b = a + Math.PI / 12;
        const c = a - Math.PI / 12;
        const y = -0.007 + j * 0.002;
        const r = 0.00295;
        for (const next of [b, c])
          edges.push(
            Math.cos(a) * r,
            y,
            Math.sin(a) * r,
            Math.cos(next) * r,
            y + 0.002,
            Math.sin(next) * r,
          );
      }
    }
    cage.setAttribute('position', new T.Float32BufferAttribute(edges, 3));
    stent.add(
      new T.LineSegments(
        cage,
        new T.LineBasicMaterial({ color: '#dcf7ff', depthTest: false }),
      ),
    );
    const material = advance.material as T.MeshStandardMaterial;
    material.emissive.set('#caaa4f');
    material.emissiveIntensity = 0.86;
    material.depthTest = false;
    tip.material.depthTest = false;
    advance.renderOrder = 3;
    tip.renderOrder = 4;
    group.add(advance, tip, plaque, balloon, stent);
  }
  function update(
    time: number,
    showFlow: boolean,
    stage: number,
    progress: number,
    split: number,
  ) {
    const t = Math.min(1, Math.max(0, progress));
    const opened = stage >= 4 ? 1 : stage === 3 ? t : 0;
    for (const { curve, speed, particles, id } of particleSets) {
      const restricted = id === 'anterior-interventricular-artery' && stage > 0;
      particles.visible = showFlow && split === 0;
      if (!particles.visible) continue;
      const count = restricted ? Math.round(10 + 14 * opened) : 24;
      particles.count = count;
      for (let i = 0; i < count; i++) {
        const travel =
          (time * speed * (restricted ? 0.66 + 0.34 * opened : 1) + i / count) %
          1;
        curve.getPointAt(travel, point);
        cell.position.copy(point);
        cell.position.z += Math.sin(i * 1.72) * 0.00065;
        cell.position.x += Math.cos(i * 1.72) * 0.00065;
        cell.updateMatrix();
        particles.setMatrixAt(i, cell.matrix);
      }
      particles.instanceMatrix.needsUpdate = true;
    }
    if (!wirePath || !advance) return;
    plaque.visible = split === 0 && stage >= 1;
    plaque.scale.set(
      0.0027 - opened * 0.0018,
      0.0054,
      0.0036 - opened * 0.0021,
    );
    const advanceAt = stage === 2 ? t : Math.min(1, reachedLesion + 0.18);
    advance.visible = split === 0 && (stage === 3 || (stage === 2 && t > 0));
    tip.visible = advance.visible;
    advance.geometry.setDrawRange(0, Math.round(advanceAt * 72) * 8 * 6);
    wirePath.getPointAt(advanceAt, tip.position);
    balloon.visible = split === 0 && stage === 3;
    balloon.scale.set(0.0011 + opened * 0.002, 0.0061, 0.0011 + opened * 0.002);
    stent.visible = split === 0 && stage === 4;
  }
  return { group, update, lesion };
}
