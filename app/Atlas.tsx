import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import {
  catalogueLayout,
  inAtlasRegion,
  isFootStructure,
  type AtlasGroup,
} from './atlas-layout';
import AtlasSurface from './AtlasSurface';
import { loadDetailedModel, detailedStructureMatches } from './detailed-models';
import { relativeSlice, type AtlasSlice } from './atlas-slice';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
export type AtlasProps = {
  modelVariant?: 'male' | 'female';
  slice?: AtlasSlice | null;
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
  /** Optional exploration modes used by the compact atlas controls. */
  transparency?: number;
  layoutMode?: 'assembled' | 'layers' | 'grid';
  region?: 'all' | 'arm' | 'ankle';
  /** Simplified ankle motion, in degrees. It rotates the available ankle/foot geometry. */
  ankleMotion?: number;
  /** Inversion/eversion of the foot, in degrees. */
  ankleInversion?: number;
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
    setStatus('Carregando modelo anatômico detalhado…');
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
      camera = new T.PerspectiveCamera(34, 1, 0.01, 1000);
    camera.position.set(0, 0.95, 3.7);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.9, 0);
    controls.enableDamping = true;
    controls.minDistance = 0.15;
    controls.maxDistance = 500;
    scene.add(new T.HemisphereLight(0xdff7ff, 0x31404c, 3));
    const key = new T.DirectionalLight(0xffffff, 3);
    key.position.set(2, 3, 4);
    scene.add(key);
    const rim = new T.DirectionalLight(0x72e1e2, 2);
    rim.position.set(-2, 1, -2);
    scene.add(rim);
    const slicePlane = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color: 0x32dced, transparent: true, opacity: 0.25, side: T.DoubleSide, depthWrite: false }));
    slicePlane.visible = false;
    scene.add(slicePlane);
    const meshes: T.Mesh[] = [],
      clip = new T.Plane(new T.Vector3(1, 0, 0), 10),
      ray = new T.Raycaster(),
      pointer = new T.Vector2();
    let lastEmpty: boolean | undefined;
    let lastReset = -1,
      lastFocus = '',
      model: T.Group;
    const groupCenters = new Map<string, T.Vector3>(),
      gridOffsets = new Map<string, T.Vector3>(),
      anklePivots = new Map<'left' | 'right', T.Vector3>();
    const match = (m: T.Mesh, id: string) =>
      detailedStructureMatches(m, id);
    loadDetailedModel(props.modelVariant ?? 'male', (message) => { if (!disposed) setStatus(message); }).then(
      (group) => {
        if (disposed) { group.traverse((o) => { if (o instanceof T.Mesh) { o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); } }); return; }
        model = group;
        scene.add(model);
        model.updateMatrixWorld(true);
        model.traverse((o) => {
          if (!(o instanceof T.Mesh)) return;
          const m = o as T.Mesh;
          const source = Array.isArray(m.material) ? m.material : [m.material];
          const material = source.map((value) => {
            const cloned = value.clone() as T.MeshStandardMaterial;
            cloned.clippingPlanes = [clip];
            cloned.side = T.DoubleSide;
            return cloned;
          });
          m.material = Array.isArray(m.material) ? material : material[0];
          m.userData.original = m.position.clone();
          m.userData.scale = m.scale.clone();
          m.userData.quaternion = m.quaternion.clone();
          m.userData.materials = material;
          m.userData.colors = material.map((value) => value.color.clone());
          m.userData.opacities = material.map((value) => value.opacity);
          m.geometry.computeBoundingBox();
          m.userData.center = m.geometry
            .boundingBox!.getCenter(new T.Vector3())
            .applyMatrix4(m.matrixWorld);
          meshes.push(m);
        });
        // The GLB contains several mesh fragments per selectable structure.
        // Derive their bounds from the loaded geometry, then move each whole
        // structure as a unit when the catalogue/grid view is requested.
        const grouped = new Map<string, T.Box3>();
        meshes.forEach((mesh) => {
          const id = String(mesh.userData.anatomyId || mesh.uuid);
          const box = grouped.get(id) ?? new T.Box3();
          box.expandByObject(mesh);
          grouped.set(id, box);
        });
        const groups: AtlasGroup[] = [];
        grouped.forEach((box, id) => {
          const center = box.getCenter(new T.Vector3());
          groupCenters.set(id, center);
          const size = box.getSize(new T.Vector3());
          groups.push({ id, center, size });
          if (/talus/.test(id))
            anklePivots.set(
              id.endsWith('left') ? 'left' : 'right',
              center.clone(),
            );
        });
        catalogueLayout(groups).forEach((target, id) => {
          const center = groupCenters.get(id)!;
          gridOffsets.set(
            id,
            new T.Vector3(target.x, target.y, target.z).sub(center),
          );
        });
        setStatus('');
      },
    ).catch((error) => {
      console.error('Falha no modelo anatômico', error);
      if (!disposed) setStatus('Não foi possível carregar o modelo. Verifique a conexão e tente novamente.');
    });
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
    const doublePick = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      pointer.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        (-(e.clientY - r.top) / r.height) * 2 + 1,
      );
      ray.setFromCamera(pointer, camera);
      const hit = ray.intersectObjects(meshes.filter((m) => m.visible))[0];
      if (!hit) return;
      const box = new T.Box3().setFromObject(hit.object);
      if (box.isEmpty()) return;
      const center = box.getCenter(new T.Vector3());
      const distance = Math.max(
        box.getSize(new T.Vector3()).length() * 1.8,
        0.28,
      );
      controls.target.copy(center);
      camera.position.copy(center).add(new T.Vector3(0, 0, distance));
      controls.update();
      current.current.onSelect(
        hit.object.userData.anatomyId,
        hit.object.userData.sourceName || hit.object.name,
      );
    };
    const contextLost = (e: Event) => {
      e.preventDefault();
      setStatus(
        'A renderização 3D foi interrompida pelo navegador. Recarregue a página para recuperar o atlas.',
      );
    };
    const contextRestored = () => setStatus('');
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    renderer.domElement.addEventListener(
      'webglcontextrestored',
      contextRestored,
    );
    renderer.domElement.addEventListener('pointerdown', start);
    renderer.domElement.addEventListener('pointerup', pick);
    renderer.domElement.addEventListener('dblclick', doublePick);
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
      slicePlane.visible = Boolean(p.slice) && (!p.layoutMode || p.layoutMode === 'assembled');
      if (p.slice) {
        const { axis, position, bounds } = relativeSlice(p.slice);
        const center = new T.Vector3((bounds.x[0]+bounds.x[1])/2, (bounds.y[0]+bounds.y[1])/2, (bounds.z[0]+bounds.z[1])/2);
        center[axis] = position;
        slicePlane.position.copy(center);
        slicePlane.rotation.set(axis === 'y' ? -Math.PI/2 : 0, axis === 'x' ? Math.PI/2 : 0, 0);
        slicePlane.scale.set(axis === 'x' ? bounds.z[1]-bounds.z[0] : bounds.x[1]-bounds.x[0], axis === 'y' ? bounds.z[1]-bounds.z[0] : bounds.y[1]-bounds.y[0], 1);
      }
      for (const m of meshes) {
        const id = String(m.userData.anatomyId),
          sys = m.userData.anatomySystem,
          materials = m.userData.materials as T.MeshStandardMaterial[],
          center = groupCenters.get(id) ?? (m.userData.center as T.Vector3),
          inRegion = inAtlasRegion(p.region, id, center);
        m.visible =
          (p.system === 'all' ? (!m.userData.isEnvelope || p.isolate) : sys === p.system) &&
          inRegion &&
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
        if (p.layoutMode === 'layers') {
          const layerOrder: Record<string, number> = {
            muscular: -2,
            skeletal: -1,
            nervous: 0,
            cardiovascular: 1,
            lymphatic: 2,
          };
          m.position.x += (layerOrder[sys] ?? 3) * 0.55;
        } else if (p.layoutMode === 'grid') {
          // `gridOffsets` is calculated per anatomyId, so a named structure
          // remains intact even when it is made of many GLB mesh fragments.
          m.position.add(gridOffsets.get(id) ?? new T.Vector3());
        }
        if (p.beating && match(m, 'heart-')) {
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
        if (
          (p.ankleMotion || p.ankleInversion) &&
          (isFootStructure(id) || center.y < 0.085)
        ) {
          const side = center.x >= 0 ? 'left' : 'right';
          const pivot = anklePivots.get(side) ?? center;
          const q = new T.Quaternion().setFromAxisAngle(
            new T.Vector3(1, 0, 0),
            ((p.ankleMotion ?? 0) * Math.PI) / 180,
          );
          if (p.ankleInversion)
            q.premultiply(
              new T.Quaternion().setFromAxisAngle(
                new T.Vector3(0, 0, 1),
                (p.ankleInversion * Math.PI) / 180,
              ),
            );
          m.position.sub(pivot).applyQuaternion(q).add(pivot);
          m.quaternion.premultiply(q);
        }
        const opacity =
          1 - (Math.min(100, Math.max(0, p.transparency ?? 0)) / 100) * 0.82;
        materials.forEach((mat, index) => {
          mat.color.copy(m.userData.colors[index]);
          mat.transparent = opacity < 0.999;
          mat.opacity = (m.userData.opacities[index] ?? 1) * opacity;
          mat.depthWrite = opacity > 0.98;
          mat.emissive.setHex(match(m, p.selected) ? 0x136d72 : 0);
          mat.emissiveIntensity = 0.35;
          if (p.pathology && match(m, p.pathology)) {
            mat.color.set('#ff655f');
            mat.emissive.set('#a51818');
            mat.emissiveIntensity = 0.35 + 0.15 * Math.sin(time * 0.003);
          }
        });
      }
      if (meshes.length) {
        const empty = !meshes.some(m => m.visible);
        if (empty !== lastEmpty) { lastEmpty = empty; setStatus(empty ? 'Nenhuma estrutura disponível com estes filtros. Use Resetar ou escolha outro sistema/modelo.' : ''); }
      }
      if (lastReset !== p.reset) {
        lastReset = p.reset;
        controls.target.set(0, 0.9, 0);
        camera.position.set(0, 0.95, 3.7);
        lastFocus = '';
      }
      const focusKey = p.isolate
        ? p.selected
        : p.layoutMode && p.layoutMode !== 'assembled'
          ? p.layoutMode
          : p.region && p.region !== 'all'
            ? p.region
            : '';
      const focus = [focusKey, p.region, p.layoutMode, p.system].join(':');
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
      try {
        renderer.render(scene, camera);
      } catch (error) {
        cancelAnimationFrame(frame);
        console.error('Atlas render failed', error);
        setStatus(
          'Não foi possível desenhar o atlas neste navegador. Recarregue a página ou tente outro navegador com suporte a WebGL 2.',
        );
      }
    };
    animate(0);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      el.removeEventListener('keydown', keyboard);
      renderer.domElement.removeEventListener('pointerdown', start);
      renderer.domElement.removeEventListener('pointerup', pick);
      renderer.domElement.removeEventListener('dblclick', doublePick);
      controls.dispose();
      meshes.forEach((m) => {
        m.geometry.dispose();
        (m.userData.materials as T.Material[]).forEach((material) =>
          material.dispose(),
        );
      });
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      renderer.domElement.removeEventListener(
        'webglcontextrestored',
        contextRestored,
      );
      slicePlane.geometry.dispose();
      slicePlane.material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [props.modelVariant]);
  return <><AtlasSurface surfaceRef={host} status={status} />{props.slice && <div className="atlas-slice-caption">Plano {props.slice.plane} · posição relativa {Math.round(props.slice.fraction * 100)}%<br/>Referência didática, sem registro ao paciente</div>}</>;
}
