import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { DicomSeries, DicomSlice } from './dicom';
import { hasPatientGeometry, sliceCorners } from './patient-geometry';

type Props = {
  series: DicomSeries;
  index: number;
  windowCenter: number;
  windowWidth: number;
  onIndex: (index: number) => void;
};

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

export default function PatientSlices({ series, index, windowCenter, windowWidth, onIndex }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<{series: DicomSeries; position: T.Vector3; target: T.Vector3} | null>(null);
  const [status, setStatus] = useState('');
  const usable = hasPatientGeometry(series);
  const safeIndex = Math.max(0, Math.min(series.slices.length - 1, index));

  useEffect(() => {
    if (!usable || !host.current) return;
    const target = host.current;
    let renderer: T.WebGLRenderer;
    try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true }); }
    catch { setStatus('A visualização espacial exige WebGL neste dispositivo.'); return; }
    setStatus('');
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    target.appendChild(renderer.domElement);
    const scene = new T.Scene();
    scene.background = new T.Color(0x06131c);
    const camera = new T.PerspectiveCamera(38, 1, 0.1, 100000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    const resources: Array<T.BufferGeometry | T.Material | T.Texture> = [];
    const textureIndexes = [...new Set([safeIndex - 1, safeIndex, safeIndex + 1].filter((value) => value >= 0 && value < series.slices.length))];
    const box = new T.Box3();
    for (const slice of series.slices) for (const corner of sliceCorners(slice)!) box.expandByPoint(new T.Vector3(...corner));
    const center = box.getCenter(new T.Vector3());
    const size = box.getSize(new T.Vector3());
    const radius = Math.max(size.length() / 2, 1);
    controls.target.copy(center);
    camera.position.copy(center).add(new T.Vector3(0.9, 0.7, 1.5).normalize().multiplyScalar(radius / Math.sin(19 * Math.PI / 180) * 1.15));
    if (view.current?.series === series) { camera.position.copy(view.current.position); controls.target.copy(view.current.target); }
    camera.near = Math.max(0.01, radius / 1000);
    camera.far = radius * 1000;
    camera.updateProjectionMatrix();
    scene.add(new T.AmbientLight(0xffffff, 1));
    for (let i = 0; i < series.slices.length; i++) {
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
    scene.add(bounds);
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
      view.current = {series, position: camera.position.clone(), target: controls.target.clone()};
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      resources.forEach((resource) => resource.dispose());
      bounds.geometry.dispose();
      (bounds.material as T.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [series, safeIndex, usable, windowCenter, windowWidth]);

  if (!usable) return <p className="plane-status">Visualização espacial indisponível: esta série precisa de posição, orientação e espaçamento de pixel DICOM válidos em todos os cortes.</p>;
  return <section className="patient-slices" aria-label="Pilhas de cortes no espaço do paciente">
    <div ref={host} style={{ height: 300, borderRadius: 8, overflow: 'hidden', background: '#06131c' }} />
    {status && <p className="plane-status">{status}</p>}
    <div className="image-tools"><button disabled={safeIndex === 0} onClick={() => onIndex(safeIndex - 1)}>← Corte anterior</button><button disabled={safeIndex === series.slices.length - 1} onClick={() => onIndex(safeIndex + 1)}>Próximo corte →</button></div>
    <small>Geometria espacial dos cortes DICOM no sistema LPS do paciente. Mostra pixels adquiridos e seus planos físicos; não é segmentação de órgãos nem registro com o atlas genérico.</small>
  </section>;
}
