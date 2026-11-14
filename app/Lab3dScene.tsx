import { useEffect, useRef, useState, type RefObject } from 'react';
import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadDetailedManifest, loadDetailedModel } from './detailed-models';
import { heartLighting } from './heart-model';
import {
  labLayers,
  labOrganLayer,
  labOrganName,
  type LabAxis,
  type LabCamera,
  type LabScale,
  type LabView,
} from './lab3d-data';
import { makeMolecule, makeNeuron, type Molecule } from './lab3d-geometry';
import { makeCoronaryDemo } from './lab3d-coronary';

export type LabPart = { id: string; name: string; layer: string };
type Props = {
  scope: LabScale;
  molecule: Molecule;
  view: LabView;
  layers: string[];
  spread: number;
  cut: number;
  axis: LabAxis;
  selected: string;
  focus: number;
  camera: LabCamera;
  cameraReset: number;
  lookAtLesion: boolean;
  pointCloud: boolean;
  showHydrogen: boolean;
  showFlow: boolean;
  stage: number;
  progress: number;
  playing: boolean;
  bpm: number;
  time: RefObject<number>;
  onSelect: (id: string) => void;
  onParts: (parts: LabPart[]) => void;
};

function ghostMaterial(color: T.Color, clip: T.Plane) {
  return new T.ShaderMaterial({
    clipping: true,
    clippingPlanes: [clip],
    transparent: true,
    depthWrite: false,
    side: T.DoubleSide,
    uniforms: { tint: { value: color.clone() }, density: { value: 0.75 } },
    vertexShader: `
      varying vec3 eye;
      varying vec3 n;
      #include <clipping_planes_pars_vertex>
      void main() {
        vec4 mvPosition=modelViewMatrix*vec4(position,1.);
        eye=normalize(-mvPosition.xyz);
        n=normalize(normalMatrix*normal);
        gl_Position=projectionMatrix*mvPosition;
        #include <clipping_planes_vertex>
      }`,
    fragmentShader: `
      varying vec3 eye;
      varying vec3 n;
      uniform vec3 tint;
      uniform float density;
      #include <clipping_planes_pars_fragment>
      void main() {
        #include <clipping_planes_fragment>
        float rim=pow(1.-abs(dot(normalize(n),normalize(eye))),2.4);
        float glow=pow(rim,1.8);
        gl_FragColor=vec4(mix(tint,vec3(.70,.93,1.),glow*.90),min(.77,density*(.08+.75*rim)));
        #include <colorspace_fragment>
      }`,
  });
}
const tissue = new T.Color('#d49b89');
const selection = new T.Color('#68f5ff');
const axisIndex = { sagital: 'x', axial: 'y', coronal: 'z' } as const;
const direction = {
  frontal: [0, 0.07, 1],
  lateral: [1, 0.08, 0.03],
  superior: [0, 1, 0.025],
  oblique: [0.62, 0.28, 1],
} as const;
const disposeObject = (root: T.Object3D) =>
  root.traverse((object) => {
    if (
      !(
        object instanceof T.Mesh ||
        object instanceof T.LineSegments ||
        object instanceof T.Points
      )
    )
      return;
    object.geometry.dispose();
    (Array.isArray(object.material)
      ? object.material
      : [object.material]
    ).forEach((m: T.Material) => m.dispose());
    if (object instanceof T.InstancedMesh) object.dispose();
  });

export default function Lab3dScene(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const tag = useRef<HTMLDivElement>(null);
  const current = useRef(props);
  current.current = props;
  const [status, setStatus] = useState('');
  const { scope, molecule } = props;

  useEffect(() => {
    const container = host.current!;
    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setStatus('Este navegador não disponibilizou WebGL.');
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    renderer.localClippingEnabled = true;
    container.appendChild(renderer.domElement);
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(36, 1, 0.03, 30);
    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbit.minDistance = 0.35;
    orbit.maxDistance = 18;
    const { ambient, key, rim } = heartLighting;
    scene.add(
      new T.HemisphereLight(ambient.sky, ambient.ground, ambient.intensity),
    );
    for (const lightConfig of [key, rim]) {
      const light = new T.DirectionalLight(
        lightConfig.color,
        lightConfig.intensity,
      );
      light.position.fromArray(lightConfig.position);
      scene.add(light);
    }
    const clip = new T.Plane(new T.Vector3(0, 0, 1), 10);
    const clips = [clip];
    const pivot = new T.Group();
    scene.add(pivot);
    let base: T.Group;
    let coronary: ReturnType<typeof makeCoronaryDemo> | undefined;
    let neuralPath: T.Curve<T.Vector3> | undefined;
    const impulse = new T.Mesh(
      new T.SphereGeometry(0.073, 16, 9),
      new T.MeshBasicMaterial({ color: '#e1fff4', depthTest: false }),
    );
    impulse.visible = false;
    impulse.renderOrder = 5;
    pivot.add(impulse);
    let disposed = false,
      frame = 0;
    const origin = new T.Vector3(),
      modelSize = new T.Vector3(2.45, 2.45, 2.45);
    type PartMesh = {
      mesh: T.Mesh;
      id: string;
      layer: string;
      name: string;
      original: T.Vector3;
      center: T.Vector3;
      offset: T.Vector3;
      solid: T.MeshStandardMaterial;
      ghost: T.ShaderMaterial;
      color: T.Color;
      cloud?: T.Points;
    };
    const meshes: PartMesh[] = [];
    const layerColors = new Map(
      labLayers[scope].map((item) => [item.id, new T.Color(item.color)]),
    );
    let scale = 1,
      cameraKey = '',
      stateKey = '';
    const tagPoint = new T.Vector3();
    const moveCamera = (preset: LabCamera, target = origin, close = false) => {
      camera.position
        .fromArray(direction[preset])
        .setLength(close ? 1.45 : Math.max(4.55, 3.4 / camera.aspect))
        .add(target);
      orbit.target.copy(target);
      orbit.update();
    };
    const resize = () => {
      const { clientWidth: width, clientHeight: height } = container;
      if (!width || !height) return;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      if (!base) moveCamera(current.current.camera);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    setStatus('Carregando modelo 3D…');
    current.current.onParts([]);
    async function load() {
      let model: T.Group;
      if (scope === 'neuron') {
        const { group, axon } = makeNeuron();
        model = group;
        neuralPath = axon;
      } else if (scope === 'molecule') model = makeMolecule(molecule);
      else {
        const manifest = await loadDetailedManifest('male');
        const sources = new Map(
          manifest.organs.flatMap((organ) => {
            const layer = labOrganLayer(organ, scope);
            return layer ? [[organ.organ_id, layer] as const] : [];
          }),
        );
        model = await loadDetailedModel('male', undefined, [...sources.keys()]);
        for (const child of model.children) {
          const id = String(child.userData.anatomyId);
          const sourceId = id
            .replace(/-left$/, '-l')
            .replace(/-right$/, '-r')
            .replaceAll('-', '_');
          child.userData.layer =
            sources.get(sourceId) ?? sources.get(id.replaceAll('-', '_'));
          child.userData.sourceName = labOrganName(
            id,
            child.userData.sourceName,
          );
        }
      }
      if (disposed) {
        disposeObject(model);
        return;
      }
      if (!model.children.length) throw new Error('empty model');
      base = model;
      const box = new T.Box3().setFromObject(model);
      const center = box.getCenter(new T.Vector3());
      const size = box.getSize(new T.Vector3());
      scale = 2.45 / Math.max(size.x, size.y, size.z);
      modelSize.copy(size).multiplyScalar(scale);
      pivot.position.copy(center).multiplyScalar(-scale);
      pivot.scale.setScalar(scale);
      pivot.add(model);
      if (scope === 'heart') {
        coronary = makeCoronaryDemo(model);
        pivot.add(coronary.group);
      }
      const entries = new Map<string, LabPart>();
      const partCenter = new T.Vector3();
      for (const object of model.children) {
        if (!(object instanceof T.Mesh)) continue;
        const { anatomyId: id, sourceName: name, layer } = object.userData;
        if (!layer) continue;
        const material = object.material as T.MeshStandardMaterial;
        material.clippingPlanes = clips;
        material.side = T.DoubleSide;
        material.roughness = 0.53;
        const color = material.color.clone();
        const groupColor = layerColors.get(layer) ?? color;
        const ghost = ghostMaterial(groupColor, clip);
        const localCenter = new T.Box3()
          .setFromObject(object)
          .getCenter(partCenter)
          .clone();
        const shift = localCenter.clone().sub(center);
        if (
          scope === 'brain' &&
          ['frontal', 'temporal', 'parietal', 'occipital'].includes(layer)
        ) {
          shift.x += (localCenter.x >= center.x ? 1 : -1) * size.x * 0.28;
        }
        const offset = shift
          .normalize()
          .multiplyScalar(
            0.58 + (scope === 'brain' && layer === 'deep' ? -0.28 : 0),
          );
        let cloud: T.Points | undefined;
        if (scope === 'brain') {
          const verts = object.geometry.getAttribute('position');
          const samples = new Float32Array(
            Math.min(1000, Math.ceil(verts.count / 3)) * 3,
          );
          for (let i = 0; i < samples.length / 3; i++) {
            const index = Math.floor((i * verts.count) / (samples.length / 3));
            samples[i * 3] = verts.getX(index);
            samples[i * 3 + 1] = verts.getY(index);
            samples[i * 3 + 2] = verts.getZ(index);
          }
          const dots = new T.BufferGeometry().setAttribute(
            'position',
            new T.BufferAttribute(samples, 3),
          );
          cloud = new T.Points(
            dots,
            new T.PointsMaterial({
              color: groupColor,
              size: 0.008,
              transparent: true,
              opacity: 0.68,
              depthWrite: false,
              clippingPlanes: clips,
            }),
          );
          cloud.visible = false;
          model.add(cloud);
        }
        meshes.push({
          mesh: object,
          id,
          layer,
          name,
          original: object.position.clone(),
          center: localCenter,
          offset,
          solid: material,
          ghost,
          color,
          cloud,
        });
        entries.set(id, { id, name, layer });
      }
      current.current.onParts(
        [...entries.values()].sort((a, b) =>
          a.name.localeCompare(b.name, 'pt-BR'),
        ),
      );
      stateKey = '';
      setStatus('');
      moveCamera(current.current.camera);
    }
    load().catch((error) => {
      if (!disposed) {
        console.error(error);
        setStatus(
          'Não foi possível carregar o modelo 3D. Troque de cena ou recarregue a página para tentar novamente.',
        );
      }
    });

    const ray = new T.Raycaster(),
      pointer = new T.Vector2();
    let x = 0,
      y = 0;
    const start = (event: PointerEvent) => {
      x = event.clientX;
      y = event.clientY;
    };
    const pick = (event: PointerEvent) => {
      if (Math.hypot(event.clientX - x, event.clientY - y) > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        1 - ((event.clientY - rect.top) / rect.height) * 2,
      );
      ray.setFromCamera(pointer, camera);
      const hit = ray
        .intersectObjects(
          meshes.map((item) => item.mesh).filter((m) => m.visible),
        )
        .find((match) => clip.distanceToPoint(match.point) >= 0);
      if (hit) current.current.onSelect(hit.object.userData.anatomyId);
    };
    renderer.domElement.addEventListener('pointerdown', start);
    renderer.domElement.addEventListener('pointerup', pick);
    const keyMove = (event: KeyboardEvent) => {
      const step =
        event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? 1
          : event.key === 'ArrowRight' || event.key === 'ArrowDown'
            ? -1
            : 0;
      if (step) {
        event.preventDefault();
        const axis = new T.Vector3(
          event.key === 'ArrowUp' || event.key === 'ArrowDown' ? 1 : 0,
          event.key === 'ArrowLeft' || event.key === 'ArrowRight' ? 1 : 0,
          0,
        );
        camera.position
          .sub(orbit.target)
          .applyAxisAngle(axis, 0.14 * step)
          .add(orbit.target);
      } else if (event.key === '+' || event.key === '-' || event.key === '=') {
        event.preventDefault();
        const offset = camera.position.sub(orbit.target);
        offset.setLength(
          T.MathUtils.clamp(
            offset.length() * (event.key === '-' ? 1.2 : 0.83),
            orbit.minDistance,
            orbit.maxDistance,
          ),
        );
        camera.position.add(orbit.target);
      }
    };
    container.addEventListener('keydown', keyMove);
    let previous = 0;
    let absolute = 0;
    let selected: PartMesh | undefined;
    let cardiacTime = 0,
      timingBpm = 0;
    function draw(now: number) {
      frame = requestAnimationFrame(draw);
      const p = current.current;
      const delta =
        previous && p.playing ? Math.min(0.06, (now - previous) / 1000) : 0;
      absolute += delta;
      previous = now;
      if (scope === 'heart') {
        const cycle = 60 / p.bpm;
        if (timingBpm !== p.bpm && timingBpm)
          cardiacTime = (cardiacTime * timingBpm) / p.bpm;
        timingBpm = p.bpm;
        cardiacTime += delta;
        p.time.current = cardiacTime;
        const elapsed = (cardiacTime % cycle) - 0.043;
        const kick =
          elapsed > 0 && elapsed < 0.22
            ? Math.sin((elapsed / 0.22) * Math.PI)
            : 0;
        if (base) base.scale.setScalar(1 - 0.021 * kick);
        if (coronary) {
          coronary.group.scale.setScalar(1 - 0.021 * kick);
          coronary.update(absolute, p.showFlow, p.stage, p.progress, p.spread);
          coronary.group.visible = p.cut === 0;
        }
      }
      if (neuralPath) {
        impulse.visible =
          p.playing &&
          p.layers.includes('axon') &&
          p.spread === 0 &&
          p.cut === 0;
        if (impulse.visible)
          neuralPath.getPointAt((absolute * 0.65) % 1, impulse.position);
      }
      const nextCamera = [
        p.camera,
        p.cameraReset,
        p.lookAtLesion,
        Boolean(coronary),
      ].join(':');
      if (cameraKey !== nextCamera && base) {
        cameraKey = nextCamera;
        const target =
          p.lookAtLesion && coronary?.lesion
            ? pivot.localToWorld(coronary.lesion.clone())
            : origin;
        moveCamera(p.camera, target, target !== origin);
      }
      const axis = axisIndex[p.axis];
      clip.normal.set(
        axis === 'x' ? -1 : 0,
        axis === 'y' ? -1 : 0,
        axis === 'z' ? -1 : 0,
      );
      const half = modelSize[axis] / 2 + p.spread * 0.6;
      clip.constant = p.cut <= 0 ? 10 : half * (1 - p.cut * 1.8);
      const nextKey = [
        p.view,
        p.layers.join(','),
        p.spread,
        p.selected,
        p.showHydrogen,
        p.pointCloud,
      ].join(':');
      if (nextKey !== stateKey) {
        stateKey = nextKey;
        selected = meshes.find((item) => item.id === p.selected);
        for (const item of meshes) {
          const show =
            scope === 'molecule'
              ? p.showHydrogen || item.layer !== 'H'
              : p.layers.includes(item.layer);
          item.mesh.visible = show && !p.pointCloud;
          item.mesh.position
            .copy(item.original)
            .addScaledVector(item.offset, p.spread / scale);
          if (item.cloud) {
            item.cloud.visible = show && p.pointCloud;
            item.cloud.position.copy(item.mesh.position);
          }
          const ghost =
            p.view === 'ghost' &&
            (scope === 'brain' ||
              ['chambers', 'great', 'veins'].includes(item.layer));
          item.mesh.material = ghost ? item.ghost : item.solid;
          const hue =
            p.view === 'colored'
              ? layerColors.get(item.layer)
              : scope === 'brain' &&
                  ['frontal', 'parietal', 'temporal', 'occipital'].includes(
                    item.layer,
                  )
                ? tissue
                : undefined;
          item.solid.color.copy(
            hue ??
              (scope === 'brain'
                ? (layerColors.get(item.layer) ?? item.color)
                : item.color),
          );
          item.solid.emissive.copy(
            item.id === p.selected ? selection : originColor,
          );
          item.solid.emissiveIntensity = item.id === p.selected ? 0.23 : 0;
          item.ghost.uniforms.density.value =
            item.id === p.selected
              ? 0.94
              : [
                    'chambers',
                    'frontal',
                    'parietal',
                    'temporal',
                    'occipital',
                  ].includes(item.layer)
                ? 0.67
                : 0.92;
          item.ghost.uniforms.tint.value.copy(
            item.id === p.selected
              ? selection
              : (layerColors.get(item.layer) ?? item.color),
          );
        }
      }
      const nextFocus = p.focus + ':' + p.selected;
      if (p.focus && selected && nextFocus !== lastFocus) {
        lastFocus = nextFocus;
        tagPoint
          .copy(selected.center)
          .add(selected.mesh.position)
          .sub(selected.original);
        base.localToWorld(tagPoint);
        moveCamera(p.camera, tagPoint, true);
      } else if (!p.focus) lastFocus = '';
      orbit.update();
      if (tag.current) {
        let show = false;
        if (selected && (selected.mesh.visible || selected.cloud?.visible)) {
          tagPoint
            .copy(selected.center)
            .add(selected.mesh.position)
            .sub(selected.original);
          base.localToWorld(tagPoint);
          const visible = clip.distanceToPoint(tagPoint) >= 0;
          tagPoint.project(camera);
          show =
            visible &&
            Math.abs(tagPoint.x) < 0.86 &&
            Math.abs(tagPoint.y) < 0.84 &&
            tagPoint.z < 1;
          tag.current.textContent = selected.name;
          tag.current.style.left = (tagPoint.x + 1) * 50 + '%';
          tag.current.style.top = (1 - tagPoint.y) * 50 + '%';
        } else if (
          coronary?.lesion &&
          p.stage > 0 &&
          p.lookAtLesion &&
          p.spread === 0 &&
          p.cut === 0
        ) {
          tagPoint.copy(coronary.lesion);
          coronary.group.localToWorld(tagPoint);
          tagPoint.project(camera);
          show =
            Math.abs(tagPoint.x) < 0.86 &&
            Math.abs(tagPoint.y) < 0.84 &&
            tagPoint.z < 1;
          tag.current.textContent = [
            '',
            'Placa na DA',
            'Trajeto do fio-guia',
            'Balão no segmento',
            'Stent na DA',
          ][p.stage];
          tag.current.style.left = (tagPoint.x + 1) * 50 + '%';
          tag.current.style.top = (1 - tagPoint.y) * 50 + '%';
        }
        tag.current.hidden = !show;
      }
      renderer.render(scene, camera);
    }
    const originColor = new T.Color(0);
    let lastFocus = '';
    frame = requestAnimationFrame(draw);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      orbit.dispose();
      container.removeEventListener('keydown', keyMove);
      renderer.domElement.removeEventListener('pointerdown', start);
      renderer.domElement.removeEventListener('pointerup', pick);
      for (const item of meshes) {
        item.ghost.dispose();
        item.solid.dispose();
      }
      disposeObject(pivot);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [scope, molecule]);

  return (
    <div className="lab3d-surface">
      <div
        className="lab3d-canvas"
        ref={host}
        tabIndex={0}
        aria-label="Modelo 3D interativo. Arraste ou use as setas para girar. Use mais e menos para aproximar."
      />
      <div className="lab3d-label" ref={tag} hidden />
      {status && (
        <p role="status" className="lab3d-loading">
          {status}
        </p>
      )}
    </div>
  );
}
