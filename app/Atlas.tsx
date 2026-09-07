import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { matchesStructure } from './anatomy';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
export type AtlasProps = {
  system: string;
  selected: string;
  isolate: boolean;
  explode: number;
  cut: number;
  plane: string;
  beating: boolean;
  motion: number;
  pathology: string;
  hidden: string[];
  reset: number;
  onSelect: (id: string, name: string) => void;
};
export default function Atlas(props: AtlasProps) {
  const host = useRef<HTMLDivElement>(null),
    current = useRef(props);
  current.current = props;
  const [status, setStatus] = useState('Carregando atlas anatômico…');
  useEffect(() => {
    if (!host.current) return;
    let disposed = false,
      frame = 0;
    const el = host.current;
    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setStatus(
        'Seu dispositivo não disponibilizou WebGL. Use a lista de estruturas para estudar.',
      );
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.localClippingEnabled = true;
    renderer.outputColorSpace = T.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    const scene = new T.Scene(),
      camera = new T.PerspectiveCamera(34, 1, 0.01, 100);
    camera.position.set(0, 0.95, 3.7);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.9, 0);
    controls.enableDamping = true;
    controls.minDistance = 0.15;
    controls.maxDistance = 7;
    scene.add(new T.HemisphereLight(0xdff7ff, 0x31404c, 3));
    const key = new T.DirectionalLight(0xffffff, 3);
    key.position.set(2, 3, 4);
    scene.add(key);
    const rim = new T.DirectionalLight(0x72e1e2, 2);
    rim.position.set(-2, 1, -2);
    scene.add(rim);
    const meshes: T.Mesh[] = [],
      clip = new T.Plane(new T.Vector3(1, 0, 0), 10),
      ray = new T.Raycaster(),
      pointer = new T.Vector2();
    let lastReset = -1,
      lastFocus = '',
      model: T.Group;
    const match = (m: T.Mesh, id: string) =>
      matchesStructure(String(m.userData.anatomyId || ''), id);
    new GLTFLoader().load(
      '/models/body.glb',
      (g) => {
        if (disposed) return;
        model = g.scene;
        scene.add(model);
        model.updateMatrixWorld(true);
        model.traverse((o) => {
          if (!(o instanceof T.Mesh)) return;
          const m = o as T.Mesh;
          const material = (
            Array.isArray(m.material) ? m.material[0] : m.material
          ).clone() as T.MeshStandardMaterial;
          material.clippingPlanes = [clip];
          material.side = T.DoubleSide;
          m.material = material;
          m.userData.original = m.position.clone();
          m.userData.scale = m.scale.clone();
          m.userData.quaternion = m.quaternion.clone();
          m.userData.color = material.color.clone();
          m.geometry.computeBoundingBox();
          m.userData.center = m.geometry
            .boundingBox!.getCenter(new T.Vector3())
            .applyMatrix4(m.matrixWorld);
          meshes.push(m);
        });
        setStatus('');
      },
      (e) => {
        if (e.total)
          setStatus(
            `Carregando atlas • ${Math.round((e.loaded / e.total) * 100)}%`,
          );
      },
      () =>
        setStatus(
          'Não foi possível carregar o atlas. Recarregue a página para tentar novamente.',
        ),
    );
    const resize = () => {
      const w = el.clientWidth,
        h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    let down = [0, 0];
    const start = (e: PointerEvent) => {
      down = [e.clientX, e.clientY];
    };
    const pick = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
      const r = el.getBoundingClientRect();
      pointer.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        (-(e.clientY - r.top) / r.height) * 2 + 1,
      );
      ray.setFromCamera(pointer, camera);
      const hit = ray
        .intersectObjects(meshes.filter((m) => m.visible))
        .find((h) => clip.distanceToPoint(h.point) >= 0);
      if (hit) {
        const m = hit.object;
        current.current.onSelect(
          m.userData.anatomyId,
          m.userData.sourceName || m.name,
        );
      }
    };
    renderer.domElement.addEventListener('pointerdown', start);
    renderer.domElement.addEventListener('pointerup', pick);
    const keyboard = (e: KeyboardEvent) => {
      const offset = camera.position.clone().sub(controls.target),
        s = new T.Spherical().setFromVector3(offset);
      if (e.key === 'ArrowLeft') s.theta -= 0.12;
      else if (e.key === 'ArrowRight') s.theta += 0.12;
      else if (e.key === 'ArrowUp') s.phi = Math.max(0.1, s.phi - 0.12);
      else if (e.key === 'ArrowDown')
        s.phi = Math.min(Math.PI - 0.1, s.phi + 0.12);
      else if (e.key === '+' || e.key === '=') s.radius *= 0.9;
      else if (e.key === '-') s.radius *= 1.1;
      else return;
      e.preventDefault();
      camera.position
        .copy(controls.target)
        .add(new T.Vector3().setFromSpherical(s));
    };
    el.addEventListener('keydown', keyboard);
    const animate = (time: number) => {
      if (disposed) return;
      frame = requestAnimationFrame(animate);
      const p = current.current;
      clip.normal.set(
        p.plane === 'sagital' ? 1 : 0,
        p.plane === 'axial' ? 1 : 0,
        p.plane === 'coronal' ? 1 : 0,
      );
      clip.constant =
        p.cut === 0
          ? 10
          : p.plane === 'axial'
            ? -((p.cut / 100) * 1.8)
            : 0.4 - (p.cut / 100) * 0.8;
      for (const m of meshes) {
        const id = String(m.userData.anatomyId),
          sys = m.userData.anatomySystem,
          mat = m.material as T.MeshStandardMaterial;
        m.visible =
          (p.system === 'all' ? sys !== 'regional' : sys === p.system) &&
          (!p.isolate || match(m, p.selected)) &&
          !p.hidden.some((id) => match(m, id));
        m.position.copy(m.userData.original);
        m.scale.copy(m.userData.scale);
        m.quaternion.copy(m.userData.quaternion);
        if (p.explode) {
          const v = (m.userData.center as T.Vector3)
            .clone()
            .sub(new T.Vector3(0, 0.9, 0));
          v.y *= 0.2;
          m.position.addScaledVector(v, p.explode / 100);
        }
        if (p.beating && id.startsWith('heart-')) {
          const scale =
            1 + Math.pow(Math.max(0, Math.sin(time * 0.00754)), 4) * 0.06;
          m.scale.multiplyScalar(scale);
        }
        if (
          p.motion &&
          /radius|ulna|carpal|metacarp|phalanx.*(hand|finger|thumb)|scaphoid|lunate|triquetr|pisiform|trapezium|trapezoid|capitate|hamate/.test(
            id,
          ) &&
          id.endsWith('left')
        ) {
          const pivot = new T.Vector3(0.229, 1.096, -0.024),
            q = new T.Quaternion().setFromAxisAngle(
              new T.Vector3(1, 0, 0),
              (-p.motion * Math.PI) / 180,
            );
          m.position.sub(pivot).applyQuaternion(q).add(pivot);
          m.quaternion.premultiply(q);
        }
        mat.color.copy(m.userData.color);
        mat.emissive.setHex(match(m, p.selected) ? 0x136d72 : 0);
        mat.emissiveIntensity = 0.35;
        if (p.pathology && match(m, p.pathology)) {
          mat.color.set('#ff655f');
          mat.emissive.set('#a51818');
          mat.emissiveIntensity = 0.35 + 0.15 * Math.sin(time * 0.003);
        }
      }
      if (lastReset !== p.reset) {
        lastReset = p.reset;
        controls.target.set(0, 0.9, 0);
        camera.position.set(0, 0.95, 3.7);
        lastFocus = '';
      }
      const focus = p.isolate ? p.selected : '';
      if (focus !== lastFocus) {
        if (focus) {
          const box = new T.Box3();
          meshes.filter((m) => m.visible).forEach((m) => box.expandByObject(m));
          if (!box.isEmpty()) {
            lastFocus = focus;
            const c = box.getCenter(new T.Vector3()),
              size = box.getSize(new T.Vector3()).length();
            controls.target.copy(c);
            camera.position
              .copy(c)
              .add(new T.Vector3(0, 0, Math.max(size * 1.7, 0.3)));
          }
        } else lastFocus = '';
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animate(0);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      el.removeEventListener('keydown', keyboard);
      controls.dispose();
      meshes.forEach((m) => {
        m.geometry.dispose();
        (m.material as T.Material).dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);
  return (
    <div
      className="atlas-canvas"
      ref={host}
      tabIndex={0}
      role="application"
      aria-label="Atlas anatômico 3D. Arraste para girar ou use as setas do teclado. Use mais e menos para zoom. Clique em uma estrutura ou use a lista de estruturas para selecionar."
    >
      {status && (
        <div className="atlas-status" role="status">
          {status}
        </div>
      )}
    </div>
  );
}
