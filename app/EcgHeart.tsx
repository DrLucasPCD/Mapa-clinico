import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadDetailedModel } from './detailed-models';
import { ecgLeads, frontalLeads, rightLeads, posteriorLeads, type ConductionStage, type LeadId, type Vector } from './ecg-model';
import { conductionNodes, conductionPaths } from './ecg-conduction';

type View = 'frontal' | 'horizontal' | 'oblique';
type Props = {
  vector: Vector;
  lead: LeadId;
  visibleLeads: readonly LeadId[];
  phase: string;
  stage: ConductionStage | null;
  showConduction: boolean;
  onSelectLead: (id: LeadId) => void;
};
const chambers = ['right_atrium', 'left_atrium', 'right_ventricle', 'left_ventricle'];
const vessels = ['ascending_aorta', 'aortic_arch', 'pulmonary_trunk', 'superior_vena_cava',
  'right_coronary_artery', 'left_coronary_artery', 'anterior_interventricular_artery', 'great_cardiac_vein'];
const toWorld = ([left, inferior, anterior]: Vector) => new T.Vector3(left, -inferior, anterior);
const allLeads = Object.keys(ecgLeads) as LeadId[];
const heartMagnification = 1.2;
const leadColor = (lead: LeadId) => {
  if (frontalLeads.some(id => id === lead)) return 0x73ccef;
  if (rightLeads.some(id => id === lead)) return 0xf6ae82;
  if (posteriorLeads.some(id => id === lead)) return 0xbfa8fc;
  return 0x82e0bf;
};

function preferredView(props: Props): View {
  if (!props.visibleLeads.length) return 'frontal';
  const plane = ecgLeads[props.lead].plane;
  return props.visibleLeads.some(id => ecgLeads[id].plane !== plane) ? 'oblique' : plane;
}

export default function EcgHeart(props: Props) {
  const container = useRef<HTMLDivElement>(null);
  const current = useRef(props);
  current.current = props;
  const orient = useRef<(view: View) => void>(() => {});
  const labels = useRef(new Map<LeadId, HTMLButtonElement>());
  const [status, setStatus] = useState('Carregando coração 3D…');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = container.current;
    if (!host) return;
    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      setStatus('O navegador não conseguiu iniciar a visualização 3D. O traçado e a projeção elétrica estão disponíveis.');
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.appendChild(renderer.domElement);
    const scene = new T.Scene();
    scene.add(new T.HemisphereLight(0xf6f5ff, 0x45323b, 2));
    const light = new T.DirectionalLight(0xffd7c7, 2.3);
    light.position.set(2, 2, 3);
    scene.add(light);
    const rim = new T.DirectionalLight(0x9ed5ff, 1.5);
    rim.position.set(-2, 1, -3);
    scene.add(rim);
    const camera = new T.PerspectiveCamera(43, 1, .01, 20);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.minDistance = 2.5;
    controls.maxDistance = 8;
    orient.current = view => {
      if (view === 'frontal') camera.position.set(0, 0, 1);
      else if (view === 'horizontal') camera.position.set(0, 1, .035);
      else camera.position.set(.54, .42, .79);
      camera.position.setLength(current.current.visibleLeads.length ? 5.1 : 3.65);
      controls.update();
    };
    const initialView = preferredView(current.current);
    orient.current(initialView);
    const ringGeometry = new T.RingGeometry(1.32, 1.326, 80);
    const frontalRing = new T.Mesh(ringGeometry, new T.MeshBasicMaterial({ color: '#51758c', side: T.DoubleSide }));
    const horizontalRing = new T.Mesh(ringGeometry, new T.MeshBasicMaterial({ color: '#496e69', side: T.DoubleSide }));
    horizontalRing.rotation.x = Math.PI / 2;
    scene.add(frontalRing, horizontalRing);
    const origin = new T.Vector3();
    const negative = new T.ArrowHelper(new T.Vector3(-1, 0, 0), origin, 1.2, 0x547185, .10, .064);
    const electric = new T.ArrowHelper(new T.Vector3(1, 0, 0), origin, .75, 0xffcd74, .16, .10);
    const leadArrows = allLeads.map((id, index) => {
      const axis = toWorld(ecgLeads[id].axis);
      const length = index % 2 === 0 ? 1.48 : 1.72;
      const arrow = new T.ArrowHelper(axis, origin, length, leadColor(id), .12, .065);
      const labelPoint = axis.clone().multiplyScalar(length + .15);
      return { id, arrow, labelPoint, length };
    });
    for (const arrow of [negative, electric, ...leadArrows.map(item => item.arrow)]) {
      for (const material of [arrow.line.material, arrow.cone.material].flat()) material.depthTest = false;
      arrow.line.renderOrder = 2;
      arrow.cone.renderOrder = 2;
      scene.add(arrow);
    }
    const pathGeometry = new T.SphereGeometry(.044, 14, 10);
    const trailMaterial = new T.MeshBasicMaterial({ color: '#45d5e6', transparent: true, depthTest: false, depthWrite: false });
    const frontMaterial = new T.MeshBasicMaterial({ color: '#ffdc86', transparent: true, depthTest: false, depthWrite: false });
    const pathways = conductionPaths.map(path => {
      const curve = new T.CatmullRomCurve3(path.points.map(point => new T.Vector3(...point).multiplyScalar(heartMagnification)));
      const tube = new T.TubeGeometry(curve, 30, .016, 6, false);
      const trail = new T.Mesh(tube, trailMaterial);
      const front = new T.Mesh(pathGeometry, frontMaterial);
      trail.renderOrder = 4;
      front.renderOrder = 5;
      scene.add(trail, front);
      return { step: path.step, curve, trail, front, count: tube.index!.count };
    });
    const nodes = conductionNodes.map(node => {
      const mesh = new T.Mesh(pathGeometry, frontMaterial);
      mesh.position.fromArray(node.point).multiplyScalar(heartMagnification);
      mesh.renderOrder = 5;
      scene.add(mesh);
      return { ...node, mesh };
    });
    const resize = () => {
      const { clientWidth: width, clientHeight: height } = host;
      if (!width || !height) return;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    let disposed = false;
    let frame = 0;
    let heart: T.Group | undefined;
    const disposeHeart = (group: T.Group) => group.traverse(object => {
      if (object instanceof T.Mesh) {
        object.geometry.dispose();
        (object.material as T.Material).dispose();
      }
    });
    loadDetailedModel('male', undefined, [...chambers, ...vessels]).then(group => {
      if (disposed) { disposeHeart(group); return; }
      // Keep the conduction paths centered on the chambers when vessels are added.
      const box = new T.Box3();
      for (const object of group.children) {
        const organ = String(object.userData.anatomyId).replaceAll('-', '_');
        if (chambers.includes(organ)) box.expandByObject(object);
        if (!(object instanceof T.Mesh)) continue;
        const material = object.material as T.MeshStandardMaterial;
        if (organ === 'pulmonary_trunk' || organ === 'superior_vena_cava') material.color.set('#4c6fb2');
        else if (organ.includes('coronary_artery') || organ === 'anterior_interventricular_artery') material.color.set('#e38978');
        else if (chambers.includes(organ)) material.color.set('#ac393d');
        material.roughness = .44;
      }
      const center = box.getCenter(new T.Vector3());
      const size = box.getSize(new T.Vector3()).length();
      if (!size) {
        disposeHeart(group);
        setStatus('O modelo do coração está indisponível.');
        return;
      }
      const scale = 2.1 * heartMagnification / size;
      group.scale.setScalar(scale);
      group.position.copy(center).multiplyScalar(-scale);
      heart = group;
      scene.add(group);
      setReady(true);
      setStatus('');
    }).catch(() => { if (!disposed) setStatus('O modelo do coração não carregou. Reabra o laboratório para tentar novamente.'); });

    let view = initialView;
    let overview = current.current.visibleLeads.length > 0;
    let leadVisibility = '';
    const projected = new T.Vector3();
    const pulsePoint = new T.Vector3();
    function draw() {
      frame = requestAnimationFrame(draw);
      const next = current.current;
      const nextView = preferredView(next);
      const nextOverview = next.visibleLeads.length > 0;
      if (view !== nextView || overview !== nextOverview) {
        overview = nextOverview;
        view = nextView;
        orient.current(view);
      }
      const visibility = next.visibleLeads.join(',') + ':' + next.lead;
      if (leadVisibility !== visibility) {
        leadVisibility = visibility;
        frontalRing.visible = next.visibleLeads.some(id => ecgLeads[id].plane === 'frontal');
        horizontalRing.visible = next.visibleLeads.some(id => ecgLeads[id].plane === 'horizontal');
        negative.visible = next.visibleLeads.length === 1;
        negative.setDirection(toWorld(ecgLeads[next.lead].axis).negate());
        for (const { id, arrow, length } of leadArrows) {
          arrow.visible = next.visibleLeads.includes(id);
          arrow.setColor(new T.Color(id === next.lead ? '#ffffff' : leadColor(id)));
          arrow.setLength(length, id === next.lead ? .18 : .12, id === next.lead ? .10 : .065);
        }
      }
      const vector = toWorld(next.vector);
      const length = vector.length();
      electric.visible = next.visibleLeads.length > 0 && length > .024;
      if (electric.visible) {
        electric.setDirection(vector.normalize());
        electric.setLength(Math.min(1.25, length * 1.24), Math.min(.16, length * .7), Math.min(.10, length * .4));
      }
      const stage = next.showConduction ? next.stage : null;
      for (const { step, curve, trail, front, count } of pathways) {
        trail.visible = Boolean(stage && stage.index >= step && (!stage.ventricularOnly || step >= 3));
        front.visible = trail.visible && stage?.index === step;
        if (stage && trail.visible) {
          const fraction = stage.index > step ? 1 : stage.progress;
          trail.geometry.setDrawRange(0, Math.floor(fraction * count / 36) * 36);
          if (front.visible) front.position.copy(curve.getPointAt(fraction, pulsePoint));
        }
      }
      for (const { mesh, step } of nodes) {
        mesh.visible = Boolean(stage && !stage.ventricularOnly && stage.index >= step);
        mesh.material = stage?.index === step ? frontMaterial : trailMaterial;
        mesh.scale.setScalar(stage?.index === step ? 1.1 + .55 * Math.sin(stage.progress * Math.PI) : .8);
      }
      heart?.children.forEach(object => {
        if (!(object instanceof T.Mesh)) return;
        const id = String(object.userData.anatomyId);
        const active = next.phase === 'atria' ? id.includes('atrium') : next.phase === 'ventricles' && id.includes('ventricle');
        const material = object.material as T.MeshStandardMaterial;
        const translucent = next.showConduction && (id.includes('atrium') || id.includes('ventricle'));
        material.transparent = translucent;
        material.opacity = translucent ? .80 : 1;
        material.depthWrite = !translucent;
        material.emissive.set(active ? '#ca630e' : '#270911');
        material.emissiveIntensity = active ? .63 : .16;
      });
      controls.update();
      renderer.render(scene, camera);
      const rect = renderer.domElement;
      const width = rect.clientWidth;
      const height = rect.clientHeight;
      const positions = leadArrows.flatMap(({ id, labelPoint }) => {
        const label = labels.current.get(id);
        if (!label) return [];
        projected.copy(labelPoint).project(camera);
        return [{ label, x: (projected.x + 1) * width / 2, y: (1 - projected.y) * height / 2 }];
      });
      // Keep nearby labels readable when the two planes overlap on screen.
      for (let pass = 0; pass < 5; pass += 1) {
        positions.forEach((point, i) => {
          for (const other of positions.slice(i + 1)) {
            if (Math.abs(point.x - other.x) >= 34 || Math.abs(point.y - other.y) >= 20) continue;
            const shift = (20 - Math.abs(point.y - other.y)) / 2;
            const direction = point.y > other.y ? 1 : -1;
            point.y += direction * shift;
            other.y -= direction * shift;
          }
        });
      }
      for (const { label, x, y } of positions) {
        label.style.left = `${Math.max(18, Math.min(width - 18, x))}px`;
        label.style.top = `${Math.max(13, Math.min(height - 46, y))}px`;
      }
    }
    draw();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      ringGeometry.dispose();
      frontalRing.material.dispose();
      horizontalRing.material.dispose();
      pathGeometry.dispose();
      trailMaterial.dispose();
      frontMaterial.dispose();
      for (const { trail } of pathways) trail.geometry.dispose();
      for (const arrow of [negative, electric, ...leadArrows.map(item => item.arrow)]) arrow.dispose();
      if (heart) disposeHeart(heart);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div className="ecg-heart">
      <div className="ecg-heart-view" ref={container} role="img" aria-label={props.showConduction ? 'Coração 3D com a condução elétrica sincronizada ao traçado' : 'Coração 3D com vetores das derivações'} />
      {ready && props.visibleLeads.map(id => (
        <button key={id} className="ecg-heart-label" style={{ '--lead-color': '#' + leadColor(id).toString(16) } as React.CSSProperties}
          ref={node => { if (node) labels.current.set(id, node); else labels.current.delete(id); }}
          aria-label={`Selecionar derivação ${id} no coração 3D`} aria-pressed={id === props.lead}
          onClick={() => props.onSelectLead(id)}>{id}</button>
      ))}
      {status && <p className="ecg-heart-status" role="status">{status}</p>}
      {ready && <div className="ecg-heart-controls" aria-label="Orientação da câmera">
        <button onClick={() => orient.current('frontal')}>Frontal</button>
        <button onClick={() => orient.current('horizontal')}>Superior</button>
        <button onClick={() => orient.current('oblique')}>Oblíqua</button>
      </div>}
      {ready && <small className="ecg-heart-help">Arraste para girar</small>}
    </div>
  );
}
