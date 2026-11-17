import {
  Raycaster,
  Vector2,
  Vector3,
  type Camera,
  type Intersection,
  type Mesh,
  type Plane,
} from 'three';

export type MarkerMesh = { id: string; mesh: Mesh };

type Anchor = {
  ids: [number, number, number];
  weights: Vector3;
};

type MarkerFrame = {
  elements: ReadonlyMap<string, HTMLDivElement>;
  meshes: ReadonlyMap<string, Mesh>;
  visible: Mesh[];
  camera: Camera;
  clip: Plane;
  width: number;
  height: number;
  active: string;
  time: number;
  translucent: boolean;
};

/** Attach to a triangle so the marker moves with the mesh and its morph targets. */
export function createAnatomyMarkerProjection() {
  const anchors = new Map<Mesh, Anchor>();
  const blocked = new Set<Mesh>();
  const lastSearch = new Map<Mesh, number>();
  const ray = new Raycaster();
  const aim = new Vector2();
  const world = new Vector3();
  const projected = new Vector3();
  const vertex = new Vector3();
  const hitPoint = new Vector3();
  const boxCenter = new Vector3();
  const extents = new Vector3();
  const checkedState = new Vector3();
  let lastCheck = -Infinity;

  function capture(mesh: Mesh, hit: Intersection) {
    if (!hit.face || !hit.barycoord) return;
    const { a, b, c } = hit.face;
    anchors.set(mesh, { ids: [a, b, c], weights: hit.barycoord.clone() });
    blocked.delete(mesh);
    lastCheck = -Infinity;
  }

  function position(mesh: Mesh, anchor: Anchor) {
    const [a, b, c] = anchor.ids;
    const { x, y, z } = anchor.weights;
    return mesh
      .getVertexPosition(a, world)
      .multiplyScalar(x)
      .addScaledVector(mesh.getVertexPosition(b, vertex), y)
      .addScaledVector(mesh.getVertexPosition(c, vertex), z)
      .applyMatrix4(mesh.matrixWorld);
  }

  function findSurface(
    mesh: Mesh,
    camera: Camera,
    clip: Plane,
    occluders?: Mesh[],
  ) {
    const box = mesh.geometry.boundingBox;
    if (!box) return;
    box.getCenter(boxCenter);
    box.getSize(extents).multiplyScalar(0.23);
    // A gyrus or valve can taper away from the centre of its bounding box.
    const samples = occluders
      ? [
          [0, 0, 0],
          [1, 0, 0],
          [-1, 0, 0],
          [0, 1, 0],
          [0, -1, 0],
          [0, 0, 1],
          [0, 0, -1],
        ]
      : [
          [0, 0, 0],
          [0, 1, 0],
          [0, -1, 0],
        ];
    for (const [x, y, z] of samples) {
      hitPoint.set(x, y, z).multiply(extents).add(boxCenter);
      hitPoint.applyMatrix4(mesh.matrixWorld).project(camera);
      if (
        Math.abs(hitPoint.x) > 1 ||
        Math.abs(hitPoint.y) > 1 ||
        Math.abs(hitPoint.z) > 1
      )
        continue;
      aim.set(hitPoint.x, hitPoint.y);
      ray.setFromCamera(aim, camera);
      const hit = ray
        .intersectObject(mesh, false)
        .find((item) => clip.distanceToPoint(item.point) >= 0);
      if (!hit) continue;
      if (occluders) {
        const occluded = ray
          .intersectObjects(occluders, false)
          .some(
            (item) =>
              item.distance < hit.distance - 0.0005 &&
              clip.distanceToPoint(item.point) >= 0,
          );
        if (occluded) continue;
      }
      capture(mesh, hit);
      return;
    }
  }

  function update(frame: MarkerFrame) {
    const {
      elements,
      meshes,
      visible,
      camera,
      clip,
      width,
      height,
      time,
      active,
      translucent,
    } = frame;
    if (!elements.size || width < 1 || height < 1) return;
    const refresh =
      time - lastCheck >= 105 ||
      camera.position.distanceToSquared(checkedState) > 0.24;
    const placements: { x: number; y: number }[] = [];
    const ordered = [...elements];
    ordered.sort(([a], [b]) => Number(b === active) - Number(a === active));

    for (const [id, el] of ordered) {
      const mesh = meshes.get(id);
      if (!mesh?.visible) {
        el.hidden = true;
        continue;
      }
      let anchor = anchors.get(mesh);
      if (
        refresh &&
        time - (lastSearch.get(mesh) ?? -Infinity) >= 420 &&
        (!anchor ||
          clip.distanceToPoint(position(mesh, anchor)) < 0 ||
          (!translucent && blocked.has(mesh)))
      ) {
        lastSearch.set(mesh, time);
        findSurface(mesh, camera, clip, translucent ? undefined : visible);
        anchor = anchors.get(mesh);
      }
      if (!anchor || clip.distanceToPoint(position(mesh, anchor)) < 0) {
        el.hidden = true;
        continue;
      }
      projected.copy(world).project(camera);
      if (
        Math.abs(projected.z) >= 1 ||
        Math.abs(projected.x) > 0.94 ||
        Math.abs(projected.y) > 0.9
      ) {
        el.hidden = true;
        continue;
      }
      const x = ((projected.x + 1) * width) / 2;
      const y = ((1 - projected.y) * height) / 2;
      if (
        placements.some((point) => Math.hypot(point.x - x, point.y - y) < 33)
      ) {
        el.hidden = true;
        continue;
      }
      if (refresh && !translucent) {
        aim.set(projected.x, projected.y);
        ray.setFromCamera(aim, camera);
        // Respect both occlusion and the user's cut plane.
        const distance = world.distanceTo(ray.ray.origin);
        const nearest = ray
          .intersectObjects(visible, false)
          .find((item) => clip.distanceToPoint(item.point) >= 0);
        if (
          nearest &&
          distance - nearest.distance > Math.max(0.0005, distance * 0.003)
        )
          blocked.add(mesh);
        else blocked.delete(mesh);
      }
      el.hidden = !translucent && blocked.has(mesh);
      if (el.hidden) continue;
      placements.push({ x, y });
      el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
      el.dataset.side = x > width / 2 ? 'left' : 'right';
      el.dataset.vertical = y > height * 0.62 ? 'up' : 'down';
    }
    if (refresh) {
      checkedState.copy(camera.position);
      lastCheck = time;
    }
  }

  return { capture, update };
}
