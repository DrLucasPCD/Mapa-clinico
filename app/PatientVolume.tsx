import { useEffect, useMemo, useRef, useState } from 'react';
import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { DicomSeries, Plane } from './dicom';
import { makeVolumeData, volumeCoordinate } from './volume-data';
import { mprGeometry } from './mpr';

const vertex = `
out vec3 back;
void main() {
  back=position+vec3(.5);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
}`;
const fragment = `
precision highp sampler3D;
in vec3 back;
uniform sampler3D volume;
uniform vec3 eye;
uniform vec3 clipCursor;
uniform vec3 dims;
uniform vec3 metric;
uniform float minimum;
uniform float intensitySpan;
uniform float low;
uniform float high;
uniform float density;
uniform int preset;
uniform int clipAxis;
uniform float clipSide;
out vec4 cloud;
float sampleIntensity(vec3 at) {
  vec2 value=texture(volume,at).rg;
  return minimum+(value.r*(256./257.)+value.g*(1./257.))*intensitySpan;
}
void main() {
  vec3 dir=normalize(back-eye);
  vec3 reciprocal=1./(sign(dir+vec3(1.e-12))*max(abs(dir),vec3(.000001)));
  vec3 t0=-eye*reciprocal;
  vec3 t1=(1.-eye)*reciprocal;
  vec3 first=min(t0,t1);
  vec3 last=max(t0,t1);
  float a=max(max(first.x,first.y),max(first.z,0.));
  float b=min(min(last.x,last.y),last.z);
  if (b<=a) discard;
  float dt=(b-a)/168.;
  vec3 dp=dir*dt;
  vec3 at=eye+dir*a+dp*.5;
  vec3 stride=1./dims;
  float stepWeight=max(.001,length(dp*metric))*120.;
  vec4 result=vec4(0.);
  for(int i=0;i<168;i++,at+=dp) {
    if (clipAxis>=0 && (at[clipAxis]-clipCursor[clipAxis])*clipSide>.0) continue;
    float val=sampleIntensity(at);
    float tint=smoothstep(low,high,val);
    if(tint<.009) continue;
    float alpha=1.-exp(-pow(tint,2.1)*density*stepWeight);
    vec3 color=vec3(.43,.61,.79)+tint*vec3(.56,.38,.20);
    if(preset==0) color=mix(vec3(.79,.15,.13),vec3(1.,.94,.67),smoothstep(70.,650.,val));
    else if(preset==1) color=mix(vec3(.58,.14,.13),vec3(1.,.79,.54),tint);
    else if(preset==2) color=mix(vec3(.52,.38,.28),vec3(1.,.95,.83),tint);
    else if(preset==3) color=mix(vec3(.41,.49,.56),vec3(.93,.97,1.),tint);
    vec3 g=vec3(sampleIntensity(at+vec3(stride.x,0.,0.))-sampleIntensity(at-vec3(stride.x,0.,0.)),
      sampleIntensity(at+vec3(0.,stride.y,0.))-sampleIntensity(at-vec3(0.,stride.y,0.)),
      sampleIntensity(at+vec3(0.,0.,stride.z))-sampleIntensity(at-vec3(0.,0.,stride.z)));
    vec3 normal=normalize(g/(metric*stride)+vec3(.00001));
    float light=.38+.62*abs(dot(normal,normalize(-dir+vec3(.22,.47,.18))));
    result.rgb+=(1.-result.a)*color*light*alpha;
    result.a+=(1.-result.a)*alpha;
    if(result.a>.98) break;
  }
  if(result.a<.01) discard;
  cloud=vec4(result.rgb/result.a,result.a);
}`;
const ctPresets = {
  angiographic: {
    label: 'Densidades altas · angio-TC',
    values: [125, 620],
    shader: 0,
  },
  soft: { label: 'Tecidos moles', values: [3, 128], shader: 1 },
  bone: { label: 'Osso', values: [245, 920], shader: 2 },
} as const;
type CtPreset = keyof typeof ctPresets;
type Props = {
  series: DicomSeries;
  point: number[] | null;
  center: number;
  width: number;
  onReference?: () => void;
};

export default function PatientVolume({
  series,
  point,
  center,
  width,
  onReference,
}: Props) {
  const data = useMemo(() => makeVolumeData(series), [series]);
  const frame = useMemo(() => mprGeometry(series), [series]);
  const host = useRef<HTMLDivElement>(null);
  const [preset, setPreset] = useState<CtPreset>('angiographic');
  const [density, setDensity] = useState(0.65);
  const [clip, setClip] = useState<'full' | Plane>('full');
  const [invert, setInvert] = useState(false);
  const [reset, setReset] = useState(0);
  const [status, setStatus] = useState('');
  const activePreset =
    series.modality === 'CT'
      ? ctPresets[preset]
      : { values: [center - width * 0.16, center + width * 0.5], shader: 3 };
  const axes = frame
    ? [frame.labels.column, frame.labels.row, frame.labels.source]
    : [];
  const settings = useRef({
    point,
    activePreset,
    density,
    cut: 0,
    invert,
    reset,
  });
  settings.current = {
    point,
    activePreset,
    density,
    cut: clip === 'full' ? -1 : axes.indexOf(clip),
    invert,
    reset,
  };

  useEffect(() => {
    if (!data || !host.current) return;
    const container = host.current;
    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({ antialias: false });
    } catch {
      setStatus('WebGL 2 indisponível. Use os cortes 2D.');
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.15));
    renderer.setClearColor('#071620');
    container.appendChild(renderer.domElement);
    setStatus('');
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(35, 1, 0.001, 40);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.minDistance = 0.15;
    controls.maxDistance = 12;
    controls.enableDamping = true;
    const [u, v, w] = data.edges.map((edge) => new T.Vector3(...edge));
    const max = Math.max(u.length(), v.length(), w.length());
    const matrix = new T.Matrix4().makeBasis(
      u.clone().divideScalar(max),
      v.clone().divideScalar(max),
      w.clone().divideScalar(max),
    );
    const inverse = matrix.clone().invert();
    const texture = new T.Data3DTexture(data.values, ...data.dims);
    texture.format = T.RGFormat;
    texture.type = T.UnsignedByteType;
    texture.minFilter = T.LinearFilter;
    texture.magFilter = T.LinearFilter;
    texture.unpackAlignment = 1;
    texture.needsUpdate = true;
    const geometry = new T.BoxGeometry(1, 1, 1);
    const cfg = settings.current;
    const material = new T.ShaderMaterial({
      glslVersion: T.GLSL3,
      vertexShader: vertex,
      fragmentShader: fragment,
      side: T.BackSide,
      transparent: true,
      depthWrite: false,
      uniforms: {
        volume: { value: texture },
        eye: { value: new T.Vector3() },
        clipCursor: { value: new T.Vector3(0.5, 0.5, 0.5) },
        dims: { value: new T.Vector3(...data.dims) },
        metric: {
          value: new T.Vector3(
            u.length() / max,
            v.length() / max,
            w.length() / max,
          ),
        },
        minimum: { value: data.minimum },
        intensitySpan: { value: data.maximum - data.minimum },
        low: { value: cfg.activePreset.values[0] },
        high: { value: cfg.activePreset.values[1] },
        density: { value: cfg.density },
        preset: { value: cfg.activePreset.shader },
        clipAxis: { value: cfg.cut },
        clipSide: { value: 1 },
      },
    });
    const cube = new T.Mesh(geometry, material);
    cube.matrixAutoUpdate = false;
    cube.matrix.copy(matrix);
    scene.add(cube);
    const locatorGeo = new T.BufferGeometry();
    const markerPositions = new Float32Array(18);
    locatorGeo.setAttribute(
      'position',
      new T.BufferAttribute(markerPositions, 3),
    );
    const markerMat = new T.LineBasicMaterial({
      color: '#40ecff',
      depthTest: false,
      transparent: true,
      opacity: 0.94,
    });
    const marker = new T.LineSegments(locatorGeo, markerMat);
    marker.frustumCulled = false;
    marker.renderOrder = 10;
    cube.add(marker);
    let resetKey = -1;
    let dirty = true;
    const resize = () => {
      if (!container.clientWidth || !container.clientHeight) return;
      renderer.setSize(container.clientWidth, container.clientHeight);
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      dirty = true;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    const eye = new T.Vector3();
    const sample = new T.Vector3();
    let frameId: number;
    let previous = undefined as typeof settings.current | undefined;
    function draw() {
      const state = settings.current;
      if (resetKey !== state.reset) {
        resetKey = state.reset;
        camera.up.set(0, 0, 1);
        camera.position
          .set(-0.95, -1.4, 0.9)
          .setLength(Math.max(2.65, 2.15 / camera.aspect));
        controls.target.set(0, 0, 0);
      }
      const moved = controls.update();
      frameId = requestAnimationFrame(draw);
      if (!dirty && !moved && previous === state) return;
      dirty = false;
      previous = state;
      const { uniforms } = material;
      uniforms.eye.value.copy(
        eye.copy(camera.position).applyMatrix4(inverse).addScalar(0.5),
      );
      uniforms.low.value = state.activePreset.values[0];
      uniforms.high.value = state.activePreset.values[1];
      uniforms.preset.value = state.activePreset.shader;
      uniforms.density.value = state.density;
      uniforms.clipAxis.value = state.cut;
      uniforms.clipSide.value = state.invert ? -1 : 1;
      marker.visible = Boolean(state.point);
      if (state.point) {
        sample.fromArray(volumeCoordinate(data!, state.point));
        uniforms.clipCursor.value.copy(sample);
        sample.addScalar(-0.5);
        for (let i = 0; i < 3; i++) {
          sample.toArray(markerPositions, i * 6);
          sample.toArray(markerPositions, i * 6 + 3);
          markerPositions[i * 6 + i] -= 0.038;
          markerPositions[i * 6 + 3 + i] += 0.038;
        }
        locatorGeo.attributes.position.needsUpdate = true;
      } else uniforms.clipCursor.value.set(0.5, 0.5, 0.5);
      renderer.render(scene, camera);
    }
    draw();
    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      controls.dispose();
      locatorGeo.dispose();
      markerMat.dispose();
      geometry.dispose();
      material.dispose();
      texture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [data]);

  if (!data)
    return (
      <p className="plane-status">
        O volume 3D exige uma pilha DICOM regular com posição, orientação e
        espaçamento válidos.
      </p>
    );
  return (
    <section
      className="patient-slices patient-volume"
      aria-label="Volume 3D do exame"
    >
      <div
        ref={host}
        className="patient-volume-surface"
        aria-label="Reconstrução volumétrica DICOM em 3D"
      />
      {status && (
        <p role="status" className="plane-status">
          {status}
        </p>
      )}
      <div className="volume-controls">
        {series.modality === 'CT' && (
          <label>
            Realçar
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value as CtPreset)}
            >
              {Object.entries(ctPresets).map(([id, config]) => (
                <option key={id} value={id}>
                  {config.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Opacidade
          <input
            aria-label="Opacidade do volume"
            type="range"
            min=".08"
            max="1.35"
            step=".01"
            value={density}
            onChange={(e) => setDensity(e.target.valueAsNumber)}
          />
        </label>
        <label>
          Recortar na mira
          <select
            value={clip}
            onChange={(e) => setClip(e.target.value as 'full' | Plane)}
          >
            <option value="full">Volume completo</option>
            <option value="axial">Axial</option>
            <option value="coronal">Coronal</option>
            <option value="sagital">Sagital</option>
          </select>
        </label>
        {clip !== 'full' && (
          <label>
            <input
              type="checkbox"
              checked={invert}
              onChange={(e) => setInvert(e.target.checked)}
            />{' '}
            Inverter lado
          </label>
        )}
      </div>
      <div className="image-tools">
        <button onClick={() => setReset((n) => n + 1)}>Restaurar vista</button>
        {onReference && (
          <button onClick={onReference}>Comparar com coração do Atlas</button>
        )}
      </div>
      <p className="plane-status">
        Volume estático calculado a partir dos voxels da série. A mira e o
        recorte usam as coordenadas do exame. As cores representam intensidade;
        não identificam lesões automaticamente.
      </p>
    </section>
  );
}
