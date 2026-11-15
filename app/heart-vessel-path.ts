import * as T from 'three';

type Edge = { to: number; length: number };
type Node = { point: T.Vector3; edges: Edge[] };

function vesselGraph(geometry: T.BufferGeometry) {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const unique = new Map<string, number>();
  const lookup = new Uint32Array(position.count);
  const nodes: Node[] = [];
  const sample = new T.Vector3();
  for (let i = 0; i < position.count; i++) {
    sample.fromBufferAttribute(position, i);
    // Collapse the duplicated vertices at seams in the source meshes.
    const key = sample
      .toArray()
      .map((value) => Math.round(value / 0.00003))
      .join('/');
    let vertex = unique.get(key);
    if (vertex === undefined) {
      vertex = nodes.length;
      unique.set(key, vertex);
      nodes.push({ point: sample.clone(), edges: [] });
    }
    lookup[i] = vertex;
  }
  const connect = (a: number, b: number) => {
    if (a === b || nodes[a].edges.some((edge) => edge.to === b)) return;
    const length = nodes[a].point.distanceTo(nodes[b].point);
    nodes[a].edges.push({ to: b, length });
    nodes[b].edges.push({ to: a, length });
  };
  const at = (i: number) => lookup[index ? index.getX(i) : i];
  for (let i = 0; i + 2 < (index?.count ?? position.count); i += 3) {
    connect(at(i), at(i + 1));
    connect(at(i + 1), at(i + 2));
    connect(at(i + 2), at(i));
  }
  return nodes;
}

function components(nodes: Node[]) {
  const visited = new Uint8Array(nodes.length);
  const result: number[][] = [];
  for (let i = 0; i < nodes.length; i++) {
    if (visited[i]) continue;
    visited[i] = 1;
    const part = [i];
    for (let j = 0; j < part.length; j++) {
      for (const { to } of nodes[part[j]].edges) {
        if (visited[to]) continue;
        visited[to] = 1;
        part.push(to);
      }
    }
    if (part.length >= 8) result.push(part);
  }
  return result;
}

function distances(nodes: Node[], root: number) {
  const distance = new Float64Array(nodes.length).fill(Infinity);
  const heap: { node: number; distance: number }[] = [];
  function add(node: number, cost: number) {
    distance[node] = cost;
    let i = heap.length;
    const entry = { node, distance: cost };
    heap.push(entry);
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (heap[parent].distance <= cost) break;
      heap[i] = heap[parent];
      i = parent;
    }
    heap[i] = entry;
  }
  add(root, 0);
  while (heap.length) {
    const current = heap[0];
    const tail = heap.pop()!;
    if (heap.length) {
      let i = 0;
      while (i * 2 + 1 < heap.length) {
        let child = i * 2 + 1;
        if (
          child + 1 < heap.length &&
          heap[child + 1].distance < heap[child].distance
        )
          child++;
        if (heap[child].distance >= tail.distance) break;
        heap[i] = heap[child];
        i = child;
      }
      heap[i] = tail;
    }
    if (current.distance !== distance[current.node]) continue;
    for (const edge of nodes[current.node].edges) {
      const next = current.distance + edge.length;
      if (next < distance[edge.to]) add(edge.to, next);
    }
  }
  return distance;
}

/** Derive teaching paths from the contours of every connected vessel segment.
 * Distances follow the source surface, so a curved artery does not get averaged across an axis. */
export function vesselPaths(
  mesh: T.Mesh,
  attachment: readonly T.Vector3[],
  towardAttachment = false,
) {
  const nodes = vesselGraph(mesh.geometry);
  const guides: T.CatmullRomCurve3[] = [];
  const distanceToAttachment = (node: number) => {
    let best = Infinity;
    for (const point of attachment)
      best = Math.min(best, point.distanceToSquared(nodes[node].point));
    return best;
  };
  for (const part of components(nodes)) {
    const seed = part.reduce(
      (best, i) =>
        distanceToAttachment(i) < distanceToAttachment(best) ? i : best,
      part[0],
    );
    const seedDistances = distances(nodes, seed);
    const endpoint = part.reduce(
      (best, i) => (seedDistances[i] > seedDistances[best] ? i : best),
      seed,
    );
    const fromEnd = distances(nodes, endpoint);
    const opposite = part.reduce(
      (best, i) => (fromEnd[i] > fromEnd[best] ? i : best),
      endpoint,
    );
    const root =
      distanceToAttachment(opposite) < distanceToAttachment(endpoint)
        ? opposite
        : endpoint;
    const travelled = root === endpoint ? fromEnd : distances(nodes, root);
    const extent = travelled[root === endpoint ? opposite : endpoint];
    if (extent < 0.0015) continue;
    const count = Math.max(4, Math.min(48, Math.ceil(extent / 0.0024)));
    const bins = Array.from({ length: count }, () => ({
      point: new T.Vector3(),
      count: 0,
    }));
    for (const i of part) {
      const bin =
        bins[Math.min(count - 1, Math.floor((travelled[i] / extent) * count))];
      bin.point.add(nodes[i].point);
      bin.count++;
    }
    const points = bins
      .filter((bin) => bin.count)
      .map((bin) => bin.point.divideScalar(bin.count));
    if (points.length < 3) continue;
    guides.push(
      new T.CatmullRomCurve3(towardAttachment ? points.reverse() : points),
    );
  }
  return guides;
}
