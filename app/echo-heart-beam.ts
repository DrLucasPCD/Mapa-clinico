import * as T from 'three';
import type { HeartRig } from './heart-motion';
import type { EchoBeam } from './echo-windows';

const rad = Math.PI / 180;
const anterior = new T.Vector3(0, 0, 1);

export function makeEchoHeartBeam() {
  const geometry = new T.CircleGeometry(1, 48, -37 * rad, 74 * rad);
  // The sector starts at the transducer, with its central ray pointing along the local X axis.
  const material = new T.MeshBasicMaterial({
    color: '#38e3df',
    transparent: true,
    opacity: 0.34,
    side: T.DoubleSide,
    depthWrite: false,
  });
  const sector = new T.Mesh(geometry, material);
  const edge = new T.LineSegments(
    new T.EdgesGeometry(geometry),
    new T.LineBasicMaterial({
      color: '#8cfaff',
      opacity: 0.9,
      transparent: true,
      depthWrite: false,
    }),
  );
  const probe = new T.Mesh(
    new T.SphereGeometry(0.046, 16, 8),
    new T.MeshBasicMaterial({ color: '#fff0ab' }),
  );
  const group = new T.Group();
  group.add(sector, edge, probe);
  sector.renderOrder = 5;
  edge.renderOrder = 6;
  probe.renderOrder = 7;
  group.visible = false;
  const scale = new T.Vector3();

  function update(
    beam: EchoBeam | null | undefined,
    rig: HeartRig | undefined,
  ) {
    group.visible = Boolean(beam && rig);
    if (!beam || !rig) return;
    const lv = rig.centers.get('left-ventricle')!;
    const end = lv.clone();
    const lateral = rig.centers
      .get('right-ventricle')!
      .clone()
      .sub(lv)
      .normalize();
    let across = rig.axis.clone();
    const start = end.clone().addScaledVector(anterior, rig.length * 0.77);
    if (beam.window === 'psax') {
      across.cross(anterior).normalize();
      const slide = (beam.tilt / 30) * rig.length * 0.48;
      start.addScaledVector(rig.axis, slide);
      end.addScaledVector(rig.axis, slide);
    }
    if (beam.window === 'apical') {
      start
        .copy(rig.apex)
        .addScaledVector(rig.axis, -rig.length * 0.37)
        .addScaledVector(anterior, rig.length * 0.3);
      end.copy(rig.apex).addScaledVector(rig.axis, rig.length * 0.88);
      across = lateral;
    }
    if (beam.window === 'subcostal') {
      start.copy(lv).addScaledVector(anterior, rig.length * 0.77);
      start.y -= rig.length * 0.9;
      end.addScaledVector(lateral, rig.length * 0.24);
      across = lateral;
    }
    start.x += beam.driftX * rig.length * 5;
    start.y -= beam.driftY * rig.length * 5;
    if (beam.window !== 'psax') end.y += (beam.tilt / 30) * rig.length * 0.38;

    const ray = end.sub(start).normalize();
    across
      .addScaledVector(ray, -across.dot(ray))
      .normalize()
      .applyAxisAngle(ray, beam.rollDelta * rad);
    const normal = new T.Vector3().crossVectors(ray, across).normalize();
    group.position.copy(start);
    group.quaternion.setFromRotationMatrix(
      new T.Matrix4().makeBasis(ray, across, normal),
    );
    scale.setScalar(beam.depth / 1000);
    sector.scale.copy(scale);
    edge.scale.copy(scale);
    probe.scale.setScalar(rig.length);
  }

  return { group, update };
}
