import * as T from 'three';
import molecules from './lab-molecules.json';

const v = (x: number, y: number, z = 0) => new T.Vector3(x, y, z);
const yAxis = v(0, 1);
const atomColors = { C: '#9aafbf', H: '#f1f5ff', N: '#4b8dff', O: '#ff5c65' };
export type Molecule = keyof typeof molecules;
export const moleculeOptions = {
  dopamina: 'Dopamina',
  serotonina: 'Serotonina',
  noradrenalina: 'Noradrenalina',
};
export const moleculeCid = (name: Molecule) => molecules[name].cid;

export function tube(
  curve: T.Curve<T.Vector3>,
  color: string,
  radius: number,
  segments = 32,
) {
  return new T.Mesh(
    new T.TubeGeometry(curve, segments, radius, 8, false),
    new T.MeshStandardMaterial({ color, roughness: 0.45 }),
  );
}
const path = (points: T.Vector3[]) => new T.CatmullRomCurve3(points);
function label(mesh: T.Mesh, id: string, name: string, layer: string) {
  Object.assign(mesh.userData, { anatomyId: id, sourceName: name, layer });
  return mesh;
}
function sphere(radius: number, position: T.Vector3, color: string) {
  const mesh = new T.Mesh(
    new T.SphereGeometry(radius, 20, 14),
    new T.MeshStandardMaterial({ color, roughness: 0.34 }),
  );
  mesh.position.copy(position);
  return mesh;
}

export function makeMolecule(name: Molecule) {
  const group = new T.Group();
  const data = molecules[name];
  const points = data.atoms.map(([, x, y, z]) =>
    v(Number(x), Number(y), Number(z)).multiplyScalar(0.29),
  );
  const center = new T.Box3().setFromPoints(points).getCenter(v(0, 0));
  points.forEach((p) => p.sub(center));
  data.atoms.forEach(([element], i) => {
    const name = String(element) as keyof typeof atomColors;
    group.add(
      label(
        sphere(
          name === 'H' ? 0.079 : name === 'C' ? 0.14 : 0.154,
          points[i],
          atomColors[name],
        ),
        'atom-' + i,
        { C: 'Carbono', H: 'Hidrogênio', N: 'Nitrogênio', O: 'Oxigênio' }[
          name
        ] +
          ' ' +
          (i + 1),
        name,
      ),
    );
  });
  for (const [i, j, order] of data.bonds) {
    const a = points[i],
      b = points[j],
      dir = b.clone().sub(a);
    const normal = dir
      .clone()
      .cross(v(0, 0, 1))
      .normalize()
      .multiplyScalar(0.037);
    for (let k = 0; k < order; k++) {
      const mesh = new T.Mesh(
        new T.CylinderGeometry(0.024, 0.024, dir.length(), 12),
        new T.MeshStandardMaterial({ color: '#8096a6', roughness: 0.52 }),
      );
      mesh.position
        .copy(a)
        .lerp(b, 0.5)
        .addScaledVector(normal, 2 * k - order + 1);
      mesh.quaternion.setFromUnitVectors(yAxis, dir.clone().normalize());
      group.add(
        label(
          mesh,
          'bond-' + i + '-' + j,
          order === 2 ? 'Ligação dupla' : 'Ligação simples',
          data.atoms[i][0] === 'H' || data.atoms[j][0] === 'H' ? 'H' : 'bond',
        ),
      );
    }
  }
  return group;
}

export function makeNeuron() {
  const group = new T.Group();
  const center = v(-0.84, 0.52, 0);
  const soma = sphere(0.28, center, '#b68de9');
  const geometry = soma.geometry;
  const pos = geometry.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      y = pos.getY(i),
      z = pos.getZ(i);
    const factor =
      1 + 0.09 * (Math.sin(x * 23) * Math.cos(y * 17) + Math.sin(z * 15));
    pos.setXYZ(i, x * factor * 1.1, y * factor * 0.87, z * factor);
  }
  geometry.computeVertexNormals();
  group.add(label(soma, 'soma', 'Corpo celular', 'soma'));
  const dendrite = (
    from: T.Vector3,
    arm: T.Vector3,
    depth: number,
    index: number,
  ) => {
    const to = from.clone().add(arm);
    const elbow = from
      .clone()
      .lerp(to, 0.54)
      .add(v(arm.y * 0.12, -arm.x * 0.12, Math.sin(index) * 0.08));
    group.add(
      label(
        tube(path([from, elbow, to]), '#e5a364', 0.006 + depth * 0.009, 12),
        'dendrites',
        'Dendritos',
        'dendrites',
      ),
    );
    if (!depth) return;
    for (let i = 0; i < 2; i++) {
      const next = arm
        .clone()
        .multiplyScalar(0.58)
        .applyAxisAngle(v(0, 0, 1), (i ? 0.47 : -0.57) + Math.sin(index) * 0.2);
      next.z += (i ? 1 : -1) * 0.09;
      dendrite(to, next, depth - 1, index * 2 + i + 1);
    }
  };
  for (let i = 0; i < 7; i++) {
    const a = 0.41 + i * 0.74;
    dendrite(
      center.clone().add(v(Math.cos(a) * 0.16, Math.sin(a) * 0.13)),
      v(Math.cos(a) * 0.51, Math.sin(a) * 0.46, Math.sin(i * 2.3) * 0.24),
      3,
      i + 1,
    );
  }
  const axon = path([
    center.clone().add(v(0.16, -0.13)),
    v(-0.44, 0.22, -0.09),
    v(-0.08, -0.14, 0.07),
    v(0.32, -0.44, -0.08),
    v(0.78, -0.58, 0.14),
    v(1.2, -0.53),
    v(1.52, -0.57),
  ]);
  group.add(label(tube(axon, '#48d9df', 0.037, 70), 'axon', 'Axônio', 'axon'));
  for (let i = 0; i < 5; i++) {
    const start = 0.22 + i * 0.132;
    const segment = path(
      Array.from({ length: 9 }, (_, j) =>
        axon.getPointAt(start + (j / 8) * 0.089),
      ),
    );
    group.add(
      label(
        tube(segment, '#b0a5f6', 0.073, 22),
        'myelin',
        'Bainha de mielina',
        'myelin',
      ),
    );
  }
  for (let i = 0; i < 5; i++) {
    const end = v(
      1.98 + Math.sin(i * 2) * 0.15,
      -1.04 + i * 0.25,
      0.17 * Math.cos(i * 2),
    );
    const terminal = path([
      axon.getPointAt(0.95),
      v(1.72, -0.74 + i * 0.09, 0),
      end,
    ]);
    group.add(
      label(
        tube(terminal, '#4ee0a1', 0.023, 17),
        'terminals',
        'Terminais axonais',
        'terminals',
      ),
    );
    group.add(
      label(
        sphere(0.054, end, '#4ee0a1'),
        'terminals',
        'Terminais axonais',
        'terminals',
      ),
    );
  }
  return { group, axon };
}

/** A guide through the vertex cloud of a named vessel, with no patient measurements. */
export function vesselGuide(
  mesh: T.Mesh,
  axis: 'x' | 'y' | 'z',
  reversed = false,
) {
  const points = mesh.geometry.getAttribute('position');
  const box = new T.Box3().setFromBufferAttribute(points as T.BufferAttribute);
  const span = box.max[axis] - box.min[axis];
  if (!Number.isFinite(span) || span < 0.00001) return undefined;
  const bins = Array.from({ length: 26 }, () => ({ point: v(0, 0), count: 0 }));
  const point = v(0, 0);
  for (let i = 0; i < points.count; i++) {
    point.fromBufferAttribute(points, i);
    const bin =
      bins[
        Math.min(
          bins.length - 1,
          Math.floor(((point[axis] - box.min[axis]) / span) * bins.length),
        )
      ];
    bin.point.add(point);
    bin.count++;
  }
  const centers = bins
    .filter((bin) => bin.count)
    .map((bin) => bin.point.divideScalar(bin.count));
  if (centers.length < 3) return undefined;
  return path(reversed ? centers.reverse() : centers);
}
