import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadDetailedModel } from './detailed-models';
import type { Vector } from './ecg-model';

type Props = { vector: Vector; axis: Vector; phase: string; plane: 'frontal' | 'horizontal' };
const chambers = ['right_atrium', 'left_atrium', 'right_ventricle', 'left_ventricle'];
const toWorld = ([left, inferior, anterior]: Vector) => new T.Vector3(left, -inferior, anterior);

export default function EcgHeart(props: Props) {
  const container = useRef<HTMLDivElement>(null);
  const current = useRef(props);
  current.current = props;
  const orient = useRef<(view: 'frontal' | 'horizontal') => void>(() => {});
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
    const camera = new T.PerspectiveCamera(35, 1, .01, 20);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.minDistance = 2.5;
    controls.maxDistance = 8;
    orient.current = view => {
      if (view === 'frontal') camera.position.set(0, 0, 4.8);
      else camera.position.set(0, 4.75, .18);
      controls.update();
    };
    orient.current(current.current.plane);
    const circle = new T.Mesh(new T.RingGeometry(1.06, 1.066, 80), new T.MeshBasicMaterial({ color: '#587287', side: T.DoubleSide }));
    scene.add(circle);
    const origin = new T.Vector3();
    const positive = new T.ArrowHelper(new T.Vector3(1, 0, 0), origin, 1.2, 0x45d5e6, .15, .085);
    const negative = new T.ArrowHelper(new T.Vector3(-1, 0, 0), origin, 1.2, 0x547185, .10, .064);
    const electric = new T.ArrowHelper(new T.Vector3(1, 0, 0), origin, .75, 0xffcd74, .16, .10);
    for (const arrow of [positive, negative, electric]) {
      for (const material of [arrow.line.material, arrow.cone.material].flat()) material.depthTest = false;
      arrow.line.renderOrder = 2;
      arrow.cone.renderOrder = 2;
      scene.add(arrow);
    }
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
    loadDetailedModel('male', undefined, chambers).then(group => {
      if (disposed) { disposeHeart(group); return; }
      const box = new T.Box3().setFromObject(group);
      const center = box.getCenter(new T.Vector3());
      const size = box.getSize(new T.Vector3()).length();
      if (!size) {
        disposeHeart(group);
        setStatus('O modelo do coração está indisponível.');
        return;
      }
      group.scale.setScalar(2.1 / size);
      group.position.copy(center).multiplyScalar(-2.1 / size);
      heart = group;
      scene.add(group);
      setReady(true);
      setStatus('');
    }).catch(() => { if (!disposed) setStatus('O modelo do coração não carregou. Reabra o laboratório para tentar novamente.'); });

    let plane = current.current.plane;
    function draw() {
      frame = requestAnimationFrame(draw);
      const next = current.current;
      if (plane !== next.plane) {
        plane = next.plane;
        orient.current(plane);
      }
      circle.rotation.x = plane === 'frontal' ? 0 : Math.PI / 2;
      const axis = toWorld(next.axis);
      positive.setDirection(axis);
      negative.setDirection(axis.negate());
      const vector = toWorld(next.vector);
      const length = vector.length();
      electric.visible = length > .024;
      if (electric.visible) {
        electric.setDirection(vector.normalize());
        electric.setLength(Math.min(1.25, length * 1.24), Math.min(.16, length * .7), Math.min(.10, length * .4));
      }
      heart?.children.forEach(object => {
        if (!(object instanceof T.Mesh)) return;
        const id = String(object.userData.anatomyId);
        const active = next.phase === 'atria' ? id.includes('atrium') : next.phase === 'ventricles' && id.includes('ventricle');
        const material = object.material as T.MeshStandardMaterial;
        material.emissive.set(active ? '#ca630e' : '#270911');
        material.emissiveIntensity = active ? .63 : .16;
      });
      controls.update();
      renderer.render(scene, camera);
    }
    draw();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      circle.geometry.dispose();
      circle.material.dispose();
      for (const arrow of [positive, negative, electric]) arrow.dispose();
      if (heart) disposeHeart(heart);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div className="ecg-heart">
      <div className="ecg-heart-view" ref={container} role="img" aria-label="Coração anatômico 3D com o eixo da derivação e o vetor elétrico" />
      {status && <p className="ecg-heart-status" role="status">{status}</p>}
      {ready && <div className="ecg-heart-controls" aria-label="Orientação da câmera">
        <button onClick={() => orient.current('frontal')}>Frontal</button>
        <button onClick={() => orient.current('horizontal')}>Superior</button>
      </div>}
      {ready && <small className="ecg-heart-help">Arraste para girar</small>}
    </div>
  );
}
