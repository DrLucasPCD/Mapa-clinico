export type LandmarkFit = {
  /** Column-major, directly compatible with THREE.Matrix4.fromArray(). */
  matrix: number[];
  rmsMm: number;
  residuals: number[];
  scale: number;
};

type Point = [number, number, number];

function validate(points: number[][], label: string): Point[] {
  if (points.length < 3) throw new Error('At least three landmark correspondences are required.');
  const result = points.map((point) => {
    if (point.length !== 3 || !point.every(Number.isFinite)) throw new Error(`${label} landmarks must contain finite 3D coordinates.`);
    return point as Point;
  });
  let extent2 = 0;
  for (let i = 0; i < result.length; i++) for (let j = i + 1; j < result.length; j++) {
    const d2 = result[i].reduce((sum, value, axis) => sum + (value - result[j][axis]) ** 2, 0);
    if (d2 === 0) throw new Error(`${label} landmarks contain a duplicate point.`);
    extent2 = Math.max(extent2, d2);
  }
  let area2 = 0;
  for (let i = 1; i < result.length; i++) for (let j = i + 1; j < result.length; j++) {
    const a = result[i].map((v, k) => v - result[0][k]);
    const b = result[j].map((v, k) => v - result[0][k]);
    const cross = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    area2 = Math.max(area2, cross.reduce((sum, value) => sum + value * value, 0));
  }
  if (!(extent2 > 0) || area2 <= extent2 * extent2 * 1e-20) throw new Error(`${label} landmarks are collinear.`);
  return result;
}

/** Eigenvectors of a real symmetric 4×4 matrix, using cyclic Jacobi sweeps. */
function largestEigenvector(input: number[][]): number[] {
  const a = input.map((row) => [...row]);
  const v = Array.from({ length: 4 }, (_, row) => Array.from({ length: 4 }, (_, col) => Number(row === col)));
  for (let sweep = 0; sweep < 64; sweep++) {
    let changed = false;
    for (let p = 0; p < 3; p++) for (let q = p + 1; q < 4; q++) {
      if (Math.abs(a[p][q]) <= 1e-15 * (1 + Math.abs(a[p][p]) + Math.abs(a[q][q]))) continue;
      changed = true;
      const angle = 0.5 * Math.atan2(2 * a[p][q], a[q][q] - a[p][p]);
      const c = Math.cos(angle), s = Math.sin(angle);
      for (let k = 0; k < 4; k++) {
        const apk = a[p][k], aqk = a[q][k];
        a[p][k] = c * apk - s * aqk; a[q][k] = s * apk + c * aqk;
      }
      for (let k = 0; k < 4; k++) {
        const akp = a[k][p], akq = a[k][q];
        a[k][p] = c * akp - s * akq; a[k][q] = s * akp + c * akq;
        const vkp = v[k][p], vkq = v[k][q];
        v[k][p] = c * vkp - s * vkq; v[k][q] = s * vkp + c * vkq;
      }
    }
    if (!changed) break;
  }
  let column = 0;
  for (let i = 1; i < 4; i++) if (a[i][i] > a[column][column]) column = i;
  const result = v.map((row) => row[column]);
  const length = Math.hypot(...result);
  return result.map((value) => value / length);
}

function determinant3(a: number[][]) {
  return a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1])
    - a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0])
    + a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0]);
}

export function fitLandmarks(sourceInput: number[][], targetInput: number[][]): LandmarkFit {
  if (sourceInput.length !== targetInput.length) throw new Error('Source and target landmark counts must match.');
  const source = validate(sourceInput, 'Source'), target = validate(targetInput, 'Target');
  const n = source.length;
  const mean = (points: Point[]): Point => [0, 1, 2].map((axis) => points.reduce((sum, point) => sum + point[axis], 0) / n) as Point;
  const cs = mean(source), ct = mean(target);
  const p = source.map((point) => point.map((v, axis) => v - cs[axis]) as Point);
  const q = target.map((point) => point.map((v, axis) => v - ct[axis]) as Point);
  const s = Array.from({ length: 3 }, () => [0, 0, 0]);
  for (let i = 0; i < n; i++) for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) s[row][col] += p[i][row] * q[i][col];
  const spread = p.reduce((sum, point) => sum + point.reduce((v, x) => v + x * x, 0), 0);
  const covarianceNorm = Math.sqrt(s.flat().reduce((sum, value) => sum + value * value, 0));
  if (determinant3(s) < -1e-10 * covarianceNorm ** 3) throw new Error('The landmark correspondence requires a reflection, which a proper anatomical registration cannot apply.');
  const [xx, xy, xz] = s[0], [yx, yy, yz] = s[1], [zx, zy, zz] = s[2];
  const trace = xx + yy + zz;
  const horn = [
    [trace, yz - zy, zx - xz, xy - yx],
    [yz - zy, xx - yy - zz, xy + yx, zx + xz],
    [zx - xz, xy + yx, -xx + yy - zz, yz + zy],
    [xy - yx, zx + xz, yz + zy, -xx - yy + zz],
  ];
  const [w, x, y, z] = largestEigenvector(horn);
  const r = [
    [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
    [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
    [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
  ];
  const rotate = (point: Point): Point => r.map((row) => row.reduce((sum, value, axis) => sum + value * point[axis], 0)) as Point;
  const scale = p.reduce((sum, point, i) => sum + rotate(point).reduce((v, value, axis) => v + value * q[i][axis], 0), 0) / spread;
  if (!Number.isFinite(scale) || scale <= 0) throw new Error('The landmark correspondence does not define a positive uniform scale.');
  const rotatedMean = rotate(cs);
  const translation: Point = ct.map((value, axis) => value - scale * rotatedMean[axis]) as Point;
  const residuals = source.map((point, i) => Math.hypot(...rotate(point).map((value, axis) => scale * value + translation[axis] - target[i][axis])));
  const rmsMm = Math.sqrt(residuals.reduce((sum, value) => sum + value * value, 0) / n);
  const matrix = [
    scale * r[0][0], scale * r[1][0], scale * r[2][0], 0,
    scale * r[0][1], scale * r[1][1], scale * r[2][1], 0,
    scale * r[0][2], scale * r[1][2], scale * r[2][2], 0,
    translation[0], translation[1], translation[2], 1,
  ];
  return { matrix, rmsMm, residuals, scale };
}
