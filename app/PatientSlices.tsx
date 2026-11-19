import { useEffect, useMemo, useRef, useState } from 'react';
import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { DicomSeries, DicomSlice } from './dicom';
import { hasPatientGeometry, sliceCorners, sliceFrame } from './patient-geometry';
import { loadDetailedModel } from './detailed-models';
import { mprGeometry, mprPlaneCorners } from './mpr';
import { lesionColor, type LesionSurface } from './lesion-mask';
import {
  overlayStyle,
  slabPlaneEquations,
  type OverlayClip,
  type OverlaySystem,
} from './registered-overlay';

type Props = {
  series: DicomSeries;
  index: number;
  windowCenter: number;
  windowWidth: number;
  onIndex: (index: number) => void;
  surface?: { positions: Float32Array; indices: Uint32Array } | null;
  lesion?: LesionSurface | null;
  registration?: { matrix: number[]; modelVariant: 'male' | 'female' } | null;
  cursorPoint?: number[] | null;
  overlaySystems?: OverlaySystem[];
  overlayClip?: OverlayClip;
};

const detailedCache = new Map<'male' | 'female', Promise<T.Group>>();

function cachedDetailedModel(variant: 'male' | 'female') {
  let promise = detailedCache.get(variant);
  if (!promise) {
    promise = loadDetailedModel(variant);
    detailedCache.set(variant, promise);
    promise.catch(() => detailedCache.delete(variant));
  }
  return promise;
}

function disposeRegisteredAtlas(group: T.Object3D) {
  group.traverse((object) => {
    if (!(object instanceof T.Mesh) || !object.userData.patientSliceMaterial) return;
    (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) => material.dispose());
  });
}

function imageTexture(slice: DicomSlice, center: number, width: number) {
  const canvas = document.createElement('canvas');
  canvas.width = slice.columns;
  canvas.height = slice.rows;
  const image = canvas.getContext('2d')!.createImageData(slice.columns, slice.rows);
  const low = center - Math.max(1, width) / 2;
  for (let i = 0; i < slice.pixels.length; i++) {
    let value = Math.round(((slice.pixels[i] * slice.slope + slice.intercept - low) / Math.max(1, width)) * 255);
    value = Math.max(0, Math.min(255, value));
    if (slice.invert) value = 255 - value;
    image.data.set([value, value, value, 255], i * 4);
  }
  canvas.getContext('2d')!.putImageData(image, 0, 0);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.minFilter = T.LinearFilter;
  return texture;
}

function planeGeometry(slice: DicomSlice) {
  const corners = sliceCorners(slice)!;
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(corners.flat(), 3));
  // DICOM stores the first pixel at Image Position; these UVs preserve its row/column order.
  geometry.setAttribute('uv', new T.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.computeVertexNormals();
  return geometry;
}

function outline(slice: DicomSlice) {
  const points = sliceCorners(slice)!.map((point) => new T.Vector3(...point));
  return new T.LineLoop(new T.BufferGeometry().setFromPoints(points), new T.LineBasicMaterial({ color: 0x75e7e7, transparent: true, opacity: 0.22 }));
}

export default function PatientSlices({ series, index, windowCenter, windowWidth, onIndex, surface = null, lesion = null, registration = null, cursorPoint = null, overlaySystems = ['nervous', 'cardiovascular'], overlayClip = 'volume' }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<T.WebGLRenderer | null>(null);
  const view = useRef<{series: DicomSeries; position: T.Vector3; target: T.Vector3; revision:number; isolated:boolean} | null>(null);
  const [isolate, setIsolate] = useState(false);
  const isolated = Boolean(lesion && isolate);
  const [status, setStatus] = useState('');
  const [resetView, setResetView] = useState(0);
  const usable = hasPatientGeometry(series);
  const safeIndex = Math.max(0, Math.min(series.slices.length - 1, index));
  const lesionGeometry = useMemo(() => {
    if (!lesion) return null;
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.BufferAttribute(lesion.positions, 3));
    geometry.setIndex(new T.BufferAttribute(lesion.indices, 1));
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    return geometry;
  }, [lesion]);
  useEffect(() => () => lesionGeometry?.dispose(), [lesionGeometry]);

  useEffect(() => {
    if (!usable || !host.current) return;
    const target = host.current;
    let renderer: T.WebGLRenderer;
    try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true }); }
    catch { setStatus('A visualização espacial exige WebGL neste dispositivo.'); return; }
    setStatus('');
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.localClippingEnabled = true;
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';
    target.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    return () => {
      rendererRef.current = null;
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [usable]);

  useEffect(() => {
    const renderer = rendererRef.current, target = host.current;
    if (!usable || !renderer || !target) return;
    const scene = new T.Scene();
    scene.background = new T.Color(0x06131c);
    const camera = new T.PerspectiveCamera(38, 1, 0.1, 100000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    const resources: Array<T.BufferGeometry | T.Material | T.Texture> = [];
    const textureIndexes = [...new Set([safeIndex - 1, safeIndex, safeIndex + 1].filter((value) => value >= 0 && value < series.slices.length))];
    const box = new T.Box3();
    for (const slice of series.slices) for (const corner of sliceCorners(slice)!) box.expandByPoint(new T.Vector3(...corner));
    if (lesionGeometry) {
      const material = new T.MeshStandardMaterial({
        color: lesionColor, transparent: !isolated, opacity: isolated ? 1 : .87,
        depthWrite: isolated, roughness: .67,
      });
      resources.push(material);
      const object = new T.Mesh(lesionGeometry, material);
      object.renderOrder = 3;
      scene.add(object);
      scene.add(new T.HemisphereLight(0xfff0d6, 0x475a76, 1.4));
      const light = new T.DirectionalLight(0xfff7e6, 2.8);
      light.position.set(box.max.x + 1, box.min.y - 1, box.max.z + 1);
      light.target.position.copy(box.getCenter(new T.Vector3()));
      scene.add(light, light.target);
    }
    const viewBounds = isolated && lesionGeometry?.boundingBox ? lesionGeometry.boundingBox : box;
    const center = viewBounds.getCenter(new T.Vector3());
    const size = viewBounds.getSize(new T.Vector3());
    const radius = Math.max(size.length() / 2, 1);
    controls.target.copy(center);
    camera.position.copy(center).add(new T.Vector3(0.9, 0.7, 1.5).normalize().multiplyScalar(radius / Math.sin(19 * Math.PI / 180) * 1.15));
    if (resetView === view.current?.revision && view.current?.series === series && view.current.isolated === isolated) { camera.position.copy(view.current.position); controls.target.copy(view.current.target); }
    camera.near = Math.max(0.01, radius / 1000);
    camera.far = radius * 1000;
    camera.updateProjectionMatrix();
    scene.add(new T.AmbientLight(0xffffff, 1));
    const mpr = mprGeometry(series);
    if (!isolated && cursorPoint) {
      const point = new T.Vector3().fromArray(cursorPoint);
      const markerSize = radius * .035;
      const markerLines = [new T.Vector3(1, 0, 0), new T.Vector3(0, 1, 0), new T.Vector3(0, 0, 1)]
        .flatMap(axis => [point.clone().addScaledVector(axis, -markerSize), point.clone().addScaledVector(axis, markerSize)]);
      const markerGeometry = new T.BufferGeometry().setFromPoints(markerLines);
      const markerMaterial = new T.LineBasicMaterial({ color: 0x19f4f4, depthTest: false });
      const marker = new T.LineSegments(markerGeometry, markerMaterial);
      marker.renderOrder = 10;
      resources.push(markerGeometry, markerMaterial);
      scene.add(marker);
      const addGuide = (corners:T.Vector3[], color:number) => {
        const guideGeometry = new T.BufferGeometry().setFromPoints([corners[0],corners[1],corners[2],corners[0],corners[2],corners[3]]);
        const guideMaterial = new T.MeshBasicMaterial({color,transparent:true,opacity:.14,side:T.DoubleSide,depthWrite:false});
        resources.push(guideGeometry,guideMaterial); scene.add(new T.Mesh(guideGeometry,guideMaterial));
        const lineGeometry = new T.BufferGeometry().setFromPoints([...corners,corners[0]]);
        const lineMaterial = new T.LineBasicMaterial({color,transparent:true,opacity:.85});
        resources.push(lineGeometry,lineMaterial); scene.add(new T.Line(lineGeometry,lineMaterial));
      };
      for (const [view, color] of [['row', 0x39ffbd], ['column', 0xff5a86]] as const) {
        const corners = mprPlaneCorners(series, view, safeIndex, cursorPoint);
        if (corners) addGuide(corners.map(corner => new T.Vector3(...corner)), color);
      }
    }
    if (!isolated && surface && surface.positions.length && surface.indices.length) {
      const geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.BufferAttribute(surface.positions, 3));
      geometry.setIndex(new T.BufferAttribute(surface.indices, 1));
      geometry.computeVertexNormals();
      const material = new T.MeshStandardMaterial({ color: 0x80d8dc, transparent: true, opacity: 0.52, roughness: 0.45, metalness: 0.05, side: T.DoubleSide, depthWrite: false });
      resources.push(geometry, material);
      scene.add(new T.Mesh(geometry, material));
    }
    for (let i = 0; !isolated && i < series.slices.length; i++) {
      const slice = series.slices[i];
      if (textureIndexes.includes(i)) {
        const texture = imageTexture(slice, windowCenter, windowWidth);
        const material = new T.MeshBasicMaterial({ map: texture, side: T.DoubleSide, transparent: true, opacity: i === safeIndex ? 1 : 0.28, depthWrite: i === safeIndex });
        const geometry = planeGeometry(slice);
        resources.push(texture, material, geometry);
        scene.add(new T.Mesh(geometry, material));
      } else {
        const line = outline(slice);
        resources.push(line.geometry, line.material);
        scene.add(line);
      }
    }
    const bounds = new T.Box3Helper(box, 0x3bc5ce);
    if (!isolated) scene.add(bounds);
    let cancelled = false;
    let registeredAtlas: T.Group | undefined;
    if (registration && !isolated) {
      if (registration.matrix.length !== 16 || !registration.matrix.every(Number.isFinite)) {
        setStatus('A matriz de registro manual é inválida.');
      } else {
        setStatus('Carregando sobreposição anatômica registrada…');
        void cachedDetailedModel(registration.modelVariant).then((source) => {
          if (cancelled) return;
          const model = source.clone(true);
          const clippingPlanes: T.Plane[] = [
            new T.Plane(new T.Vector3(1, 0, 0), -box.min.x), new T.Plane(new T.Vector3(-1, 0, 0), box.max.x),
            new T.Plane(new T.Vector3(0, 1, 0), -box.min.y), new T.Plane(new T.Vector3(0, -1, 0), box.max.y),
            new T.Plane(new T.Vector3(0, 0, 1), -box.min.z), new T.Plane(new T.Vector3(0, 0, -1), box.max.z),
          ];
          const frame = sliceFrame(series.slices[0])!;
          for (const equation of mpr ? slabPlaneEquations(frame, cursorPoint, overlayClip, mpr.stepMm, mpr.labels) : []) {
            clippingPlanes.push(new T.Plane(new T.Vector3(...equation.normal), equation.constant));
          }
          model.traverse((object) => {
            if (!(object instanceof T.Mesh)) return;
            const style = overlayStyle(
              String(object.userData.anatomySystem ?? ''),
              String(object.userData.anatomyId ?? ''),
              overlaySystems,
            );
            object.visible = Boolean(style);
            if (!style) return;
            const material = (Array.isArray(object.material) ? object.material[0] : object.material).clone() as T.MeshStandardMaterial;
            material.color.set(style.color);
            material.clippingPlanes = clippingPlanes;
            material.transparent = true;
            material.opacity = style.opacity;
            material.depthWrite = false;
            material.side = T.DoubleSide;
            object.material = material;
            object.userData.patientSliceMaterial = true;
          });
          // Source model: metres XYZ. Convert to DICOM LPS millimetres, then apply the user-fitted column-major affine.
          const sourceToLps = new T.Matrix4().fromArray([1000, 0, 0, 0, 0, 0, 1000, 0, 0, -1000, 0, 0, 0, 0, 0, 1]);
          model.matrix.copy(new T.Matrix4().fromArray(registration.matrix)).multiply(sourceToLps);
          model.matrixAutoUpdate = false;
          registeredAtlas = model;
          scene.add(model);
          setStatus('');
        }).catch(() => { if (!cancelled) setStatus('Não foi possível carregar a sobreposição anatômica registrada.'); });
      }
    }
    const resize = () => {
      const width = target.clientWidth, height = target.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(target);
    resize();
    let frame = 0;
    const render = () => { controls.update(); renderer.render(scene, camera); frame = requestAnimationFrame(render); };
    render();
    return () => {
      cancelled = true;
      view.current = {series, revision:resetView, position: camera.position.clone(), target: controls.target.clone(), isolated};
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      resources.forEach((resource) => resource.dispose());
      bounds.geometry.dispose();
      (bounds.material as T.Material).dispose();
      if (registeredAtlas) disposeRegisteredAtlas(registeredAtlas);
    };
  }, [series, safeIndex, usable, windowCenter, windowWidth, surface, lesionGeometry, isolated, registration, cursorPoint, resetView, overlaySystems, overlayClip]);

  if (!usable) return <p className="plane-status">Visualização espacial indisponível: esta série precisa de posição, orientação e espaçamento de pixel DICOM válidos em todos os cortes.</p>;
  return <section className="patient-slices" aria-label="Pilhas de cortes no espaço do paciente">
    <div ref={host} role="img" aria-label={lesion ? 'Reconstrução tridimensional da lesão no exame' : 'Cortes DICOM em três dimensões'} style={{ height: 300, borderRadius: 8, overflow: 'hidden', background: '#06131c' }} />
    {lesion && <small className="lesion-key"><i /> Região segmentada no exame</small>}
    {(surface || registration || cursorPoint) && <small>{surface && "Ciano: superfície de alta densidade da TC. "}{registration && "Ciano: sistema nervoso; vermelho/azul: vasos; marfim: esqueleto, conforme as camadas escolhidas. "}{cursorPoint && "Verde e rosa: planos ortogonais na posição da mira."}</small>}
    {status && <p className="plane-status">{status}</p>}
    <div className="image-tools">{lesion && <button aria-pressed={isolated} onClick={() => setIsolate(value => !value)}>{isolated ? 'Mostrar cortes junto da lesão' : 'Isolar lesão'}</button>}<button onClick={() => setResetView(value => value + 1)}>Resetar vista 3D</button><button disabled={safeIndex === 0} onClick={() => onIndex(safeIndex - 1)}>← Corte anterior</button><button disabled={safeIndex === series.slices.length - 1} onClick={() => onIndex(safeIndex + 1)}>Próximo corte →</button></div>
    <small>Geometria espacial dos cortes DICOM no sistema LPS do paciente. {surface && 'A superfície mostra apenas densidade alta aproximada por limiar; não identifica órgãos nem estabelece diagnóstico. '}{registration && `A anatomia colorida é um atlas genérico ajustado manualmente${overlayClip === 'volume' ? '' : ` e recortado no plano ${overlayClip}`}; não é segmentação do paciente. `}Mostra pixels adquiridos e seus planos físicos.</small>
  </section>;
}
