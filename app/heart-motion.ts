import * as T from 'three';
import type { CardiacMotion, Valve } from './heart-cycle';

type Vector = T.Vector3;
type Region =
  | 'left'
  | 'right'
  | 'atria-left'
  | 'atria-right'
  | 'vessel'
  | Valve;
type Kind = 'wall' | 'twist' | 'atrial' | 'valve';
type Frame = {
  apex: Vector;
  axis: Vector;
  u: Vector;
  v: Vector;
  length: number;
  radii: Float32Array;
};
type ValveFrame = {
  normal: Vector;
  center: Vector;
  origin: Vector;
  outward: Vector;
  furthest: number;
  span: number;
};
type Track = { mesh: T.Mesh; kinds: Kind[]; region: Region };

const rings = 12;
const sectors = 20;
const va = new T.Vector3(0, 1, 0);
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};
const mix = T.MathUtils.lerp;
const idOf = (mesh: T.Mesh) => String(mesh.userData.anatomyId ?? '');
export function cardiacValve(id: string): Valve | undefined {
  if (id.includes('semilunar-leaflet-of-pulmonary')) return 'pulmonary';
  if (id.endsWith('coronary-leaflet')) return 'aortic';
  if (id.includes('leaflet-of-left-atrioventricular')) return 'mitral';
  if (id.includes('leaflet-of-right-atrioventricular')) return 'tricuspid';
}
function chamber(id: string) {
  if (id === 'left-ventricle' || id.endsWith('-of-left-ventricle'))
    return 'left';
  if (id === 'right-ventricle' || id.endsWith('-of-right-ventricle'))
    return 'right';
  if (id === 'left-atrium') return 'atria-left';
  if (id === 'right-atrium') return 'atria-right';
}
const centerOf = (mesh: T.Mesh) => {
  mesh.geometry.computeBoundingBox();
  return mesh.geometry.boundingBox!.getCenter(new T.Vector3());
};

function createFrame(mesh: T.Mesh): Frame {
  const attr = mesh.geometry.getAttribute('position');
  const bounds =
    mesh.geometry.boundingBox ??
    new T.Box3().setFromBufferAttribute(attr as T.BufferAttribute);
  const height = bounds.max.y - bounds.min.y;
  const apex = new T.Vector3(),
    base = new T.Vector3(),
    p = new T.Vector3();
  let apical = 0,
    basal = 0;
  for (let i = 0; i < attr.count; i++) {
    p.fromBufferAttribute(attr, i);
    if (p.y < bounds.min.y + height * 0.18) {
      apex.add(p);
      apical++;
    }
    if (p.y > bounds.max.y - height * 0.22) {
      base.add(p);
      basal++;
    }
  }
  apex.divideScalar(Math.max(1, apical));
  apex.y = bounds.min.y;
  base.divideScalar(Math.max(1, basal));
  base.y = bounds.max.y;
  const axis = base.clone().sub(apex);
  const length = axis.length();
  axis.normalize();
  const u = new T.Vector3(0, 0, 1).cross(axis).normalize();
  const v = axis.clone().cross(u);
  const radii = new Float32Array(rings * sectors);
  for (let i = 0; i < attr.count; i++) {
    p.fromBufferAttribute(attr, i).sub(apex);
    const h = clamp(p.dot(axis) / length);
    const x = p.dot(u),
      y = p.dot(v);
    const theta = (Math.atan2(y, x) + 2 * Math.PI) % (2 * Math.PI);
    const row = Math.min(rings - 1, Math.floor(h * rings));
    const sector = Math.min(
      sectors - 1,
      Math.floor((theta / (2 * Math.PI)) * sectors),
    );
    const index = row * sectors + sector;
    radii[index] = Math.max(radii[index], Math.hypot(x, y));
  }
  const corrected = radii.slice();
  for (let i = 0; i < radii.length; i++) {
    const row = Math.floor(i / sectors),
      a = i % sectors;
    if (!radii[i])
      corrected[i] = Math.max(
        radii[row * sectors + ((a + 1) % sectors)],
        radii[row * sectors + ((a + sectors - 1) % sectors)],
        length * 0.17,
      );
  }
  return { apex, axis, u, v, length, radii: corrected };
}

function outerRadius(frame: Frame, h: number, theta: number) {
  const row = clamp(h) * (rings - 1),
    angle = (((theta + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI)) * sectors;
  const x = Math.floor(row),
    y = Math.floor(angle),
    nextX = Math.min(rings - 1, x + 1),
    nextY = (y + 1) % sectors;
  return mix(
    mix(
      frame.radii[x * sectors + y],
      frame.radii[x * sectors + nextY],
      angle - y,
    ),
    mix(
      frame.radii[nextX * sectors + y],
      frame.radii[nextX * sectors + nextY],
      angle - y,
    ),
    row - x,
  );
}

/** Smooth kinematic rig on the real mesh in its unloaded atlas coordinates. */
export function prepareHeartMotion(meshes: readonly T.Mesh[]) {
  const left = meshes.find((mesh) => idOf(mesh) === 'left-ventricle');
  const right = meshes.find((mesh) => idOf(mesh) === 'right-ventricle');
  if (!left || !right) return undefined;
  const frame = createFrame(left);
  const rightFrame = createFrame(right);
  const { axis, apex, u, v, length } = frame;
  const centers = new Map(meshes.map((mesh) => [idOf(mesh), centerOf(mesh)]));
  const valves = new Map<string, ValveFrame>();
  for (const name of ['mitral', 'tricuspid', 'aortic', 'pulmonary'] as const) {
    const leaflets = meshes.filter((mesh) => cardiacValve(idOf(mesh)) === name);
    if (!leaflets.length) continue;
    const center = leaflets
      .reduce((sum, mesh) => sum.add(centers.get(idOf(mesh))!), new T.Vector3())
      .divideScalar(leaflets.length);
    const inlet = name === 'mitral' || name === 'tricuspid';
    const leftSide = name === 'mitral' || name === 'aortic';
    const ventricular = leftSide ? frame : rightFrame;
    const normal = inlet
      ? ventricular.axis.clone().negate()
      : (centers
          .get(name === 'aortic' ? 'ascending-aorta' : 'pulmonary-trunk')
          ?.clone()
          .sub(center)
          .normalize() ?? va.clone());
    for (const leaflet of leaflets) {
      const origin = centers.get(idOf(leaflet))!;
      const outward = origin
        .clone()
        .sub(center)
        .addScaledVector(normal, -origin.clone().sub(center).dot(normal));
      if (outward.lengthSq() < 1e-8)
        outward.copy(ventricular.v).multiplyScalar(-1);
      outward.normalize();
      const positions = leaflet.geometry.getAttribute('position');
      const vertex = new T.Vector3();
      let near = Infinity,
        furthest = -Infinity;
      for (let i = 0; i < positions.count; i++) {
        const s = vertex
          .fromBufferAttribute(positions, i)
          .sub(origin)
          .dot(outward);
        near = Math.min(near, s);
        furthest = Math.max(furthest, s);
      }
      valves.set(idOf(leaflet), {
        normal,
        center,
        origin,
        outward,
        furthest,
        span: Math.max(0.001, furthest - near),
      });
    }
  }

  const relative = new T.Vector3(),
    shifted = new T.Vector3(),
    out = new T.Vector3();
  function deform(
    original: Vector,
    result: Vector,
    region: Region,
    kind: Kind,
    id: string,
  ) {
    result.copy(original);
    const isRight =
      region === 'right' ||
      region === 'atria-right' ||
      region === 'tricuspid' ||
      region === 'pulmonary';
    const ownFrame = isRight ? rightFrame : frame;
    if (kind === 'atrial') {
      const center = centers.get(isRight ? 'right-atrium' : 'left-atrium');
      if (center) result.lerp(center, 0.105);
      return result;
    }
    if (kind === 'valve') {
      const leaflet = valves.get(id);
      if (!leaflet) return result;
      const at = relative
        .copy(original)
        .sub(leaflet.origin)
        .dot(leaflet.outward);
      const reach = clamp((leaflet.furthest - at) / leaflet.span);
      // The annular edge stays attached. Displacement increases toward the free edge.
      const bend = reach * reach;
      result.addScaledVector(leaflet.normal, bend * leaflet.span * 0.48);
      result.addScaledVector(leaflet.outward, bend * leaflet.span * 0.22);
      return result;
    }
    relative.copy(original).sub(apex);
    const axisDistance = relative.dot(axis);
    const h = clamp(axisDistance / length);
    const radialX = relative.dot(u),
      radialY = relative.dot(v);
    const gap =
      region === 'vessel' ? clamp((axisDistance / length - 0.92) / 0.48) : 0;
    const attach = 1 - smooth(gap);
    const atrium = region.startsWith('atria');
    const sharedSeptum = isRight
      ? 1 -
        smooth(
          (frame.apex.distanceTo(original) - length * 0.24) / (length * 0.7),
        )
      : 0;
    if (kind === 'twist') {
      const angle =
        (h * 0.261799 - 0.174533) *
        (isRight ? 0.22 + 0.45 * sharedSeptum : 1) *
        attach;
      result
        .addScaledVector(
          u,
          radialX * (Math.cos(angle) - 1) - radialY * Math.sin(angle),
        )
        .addScaledVector(
          v,
          radialX * Math.sin(angle) + radialY * (Math.cos(angle) - 1),
        );
      return result;
    }
    // The longitudinal axis stays anchored near the apex. Great vessels blend back
    // to their rest position as distance from the ventricular base increases.
    const shortening = isRight ? 0.21 : 0.165;
    result.addScaledVector(axis, -shortening * h * length * attach);
    if (atrium || cardiacValve(id)) return result;
    shifted.copy(original).sub(ownFrame.apex);
    const distance = shifted.dot(ownFrame.axis);
    shifted.addScaledVector(ownFrame.axis, -distance);
    const radius = shifted.length();
    if (radius < 1e-5) return result;
    const theta = Math.atan2(shifted.dot(ownFrame.v), shifted.dot(ownFrame.u));
    const localH = clamp(distance / ownFrame.length);
    const regional =
      (0.79 + 0.21 * Math.sin(Math.PI * localH)) *
      (0.94 + 0.06 * Math.cos(theta + 0.75));
    const squeeze =
      (isRight ? 0.075 : 0.145) * regional * attach * smooth(localH / 0.21);
    const rim = outerRadius(ownFrame, localH, theta);
    // Preserve shell cross-sectional area as the cavity closes, with a smooth
    // continuation inside the estimated endocardium for papillary attachments.
    const inner = rim * (isRight ? 0.84 : 0.74);
    const adjustedOuter = rim * (1 - squeeze);
    const lengthRatio = 1 - shortening * attach;
    const lower = Math.max(
      inner * 0.43,
      Math.sqrt(
        Math.max(0, adjustedOuter ** 2 - (rim ** 2 - inner ** 2) / lengthRatio),
      ),
    );
    const shell =
      radius <= inner
        ? (radius * lower) / Math.max(0.0001, inner)
        : Math.sqrt(
            Math.max(
              0,
              lower ** 2 +
                (Math.min(radius, rim) ** 2 - inner ** 2) / lengthRatio,
            ),
          );
    const mapped =
      radius > rim ? shell + (radius - rim) * (1 - squeeze) : shell;
    return result.addScaledVector(
      shifted,
      ((mapped - radius) / radius) * attach,
    );
  }
  function weights(region: Region, kinds: Kind[], motion: CardiacMotion) {
    return kinds.map((kind) => {
      if (kind === 'twist') return motion.twist;
      if (kind === 'atrial') return motion.atrial;
      if (kind === 'valve') return motion.valves[region as Valve];
      return motion.ventricular;
    });
  }
  const meshesById = new Map<string, Track>();
  const tracks: Track[] = [];
  const sourcePoint = new T.Vector3();
  const targetPoint = new T.Vector3();
  function bind(mesh: T.Mesh, motionId = idOf(mesh)) {
    const region = cardiacValve(motionId) ?? chamber(motionId) ?? 'vessel';
    const kinds: Kind[] = ['wall', 'twist'];
    if (region.startsWith('atria')) kinds.push('atrial');
    if (cardiacValve(motionId)) kinds.push('valve');
    const geometry = mesh.geometry;
    const positions = geometry.getAttribute('position');
    const normal = geometry.getAttribute('normal');
    const target = geometry.clone();
    const pos = target.getAttribute('position');
    const morphPositions: T.BufferAttribute[] = [];
    const morphNormals: T.BufferAttribute[] = [];
    for (const kind of kinds) {
      const delta = new Float32Array(positions.count * 3);
      for (let i = 0; i < positions.count; i++) {
        sourcePoint.fromBufferAttribute(positions, i);
        deform(sourcePoint, targetPoint, region, kind, motionId);
        pos.setXYZ(i, targetPoint.x, targetPoint.y, targetPoint.z);
        targetPoint.sub(sourcePoint).toArray(delta, i * 3);
      }
      morphPositions.push(new T.BufferAttribute(delta, 3));
      if (normal) {
        target.computeVertexNormals();
        const changed = target.getAttribute('normal');
        const normals = new Float32Array(positions.count * 3);
        for (let i = 0; i < positions.count; i++) {
          sourcePoint.fromBufferAttribute(normal, i);
          targetPoint
            .fromBufferAttribute(changed, i)
            .sub(sourcePoint)
            .toArray(normals, i * 3);
        }
        morphNormals.push(new T.BufferAttribute(normals, 3));
      }
    }
    target.dispose();
    geometry.morphTargetsRelative = true;
    geometry.morphAttributes.position = morphPositions;
    if (morphNormals.length) geometry.morphAttributes.normal = morphNormals;
    mesh.updateMorphTargets();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const track: Track = { mesh, kinds, region };
    tracks.push(track);
    meshesById.set(motionId, track);
  }
  function update(motion: CardiacMotion) {
    for (const { mesh, kinds, region } of tracks) {
      const factors = weights(region, kinds, motion);
      factors.forEach((value, index) => {
        mesh.morphTargetInfluences![index] = value;
      });
    }
  }
  function point(
    id: string,
    original: Vector,
    motion: CardiacMotion,
    result: Vector,
  ) {
    const track = meshesById.get(id);
    const region = track?.region ?? chamber(id) ?? 'vessel';
    const kinds: Kind[] = track?.kinds ?? ['wall', 'twist'];
    const factors = weights(region, kinds, motion);
    result.copy(original);
    for (let i = 0; i < kinds.length; i++) {
      deform(original, out, region, kinds[i], id);
      result.addScaledVector(out.sub(original), factors[i]);
    }
    return result;
  }
  for (const mesh of meshes) bind(mesh);
  return { update, point, bind, centers, apex, axis, length };
}

export type HeartRig = NonNullable<ReturnType<typeof prepareHeartMotion>>;
