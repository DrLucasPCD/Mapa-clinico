import { useEffect, useMemo, useRef, useState } from 'react';
import { ultrasoundCaseOrder, ultrasoundCases, ultrasoundViewFor, ultrasoundZoneAt, ultrasoundZoneOrder, ultrasoundZones, type ProbePosition, type UltrasoundCaseId, type UltrasoundZone } from './ultrasound-data';
import './ultrasound.css';

type Props = { onSelectRegion?: (zone: UltrasoundZone) => void };
const clamp = (value: number) => Math.max(0, Math.min(1, value));

export default function UltrasoundSimulator({ onSelectRegion }: Props) {
  const [caseId, setCaseId] = useState<UltrasoundCaseId>('148000');
  const [position, setPosition] = useState<ProbePosition>({ x: .38, y: .35 });
  const [angle, setAngle] = useState(-35);
  const [gain, setGain] = useState(100);
  const [showGuide, setShowGuide] = useState(true);
  const [dragging, setDragging] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const zone = useMemo(() => ultrasoundZoneAt(position, caseId), [position, caseId]);
  const view = ultrasoundViewFor(caseId, zone, angle);
  const region = zone ? ultrasoundZones[zone] : null;
  const clinicalCase = ultrasoundCases[caseId];

  useEffect(() => { if (zone) onSelectRegion?.(zone); }, [zone, onSelectRegion]);

  const moveProbe = (clientX: number, clientY: number) => {
    const bounds = bodyRef.current?.getBoundingClientRect();
    if (!bounds) return;
    setPosition({ x: clamp((clientX - bounds.left) / bounds.width), y: clamp((clientY - bounds.top) / bounds.height) });
  };
  const chooseZone = (id: UltrasoundZone) => {
    setPosition({ x: ultrasoundZones[id].x, y: ultrasoundZones[id].y });
    setAngle(-35);
  };
  const chooseCase = (id: UltrasoundCaseId) => {
    setCaseId(id);
    const first = ultrasoundZoneOrder.find(zoneId => ultrasoundCases[id].zoneViews[zoneId]?.length)!;
    setPosition({ x: ultrasoundZones[first].x, y: ultrasoundZones[first].y });
    setAngle(-35);
  };

  return <section className="ultrasound-simulator" aria-label="Simulador de ultrassom">
    <header className="us-heading"><div><small>SIMULADOR INTERATIVO · USG</small><h2>Explore a janela acústica</h2><p>Arraste o transdutor sobre o abdome e gire para comparar as vistas disponíveis. Selecione um órgão para destacá-lo no atlas.</p></div><span>USG · modo B</span></header>
    <div className="us-case-picker"><label>Escolha um caso real da Radiopaedia<select aria-label="Caso de ultrassom da Radiopaedia" value={caseId} onChange={event => chooseCase(event.target.value as UltrasoundCaseId)}>{ultrasoundCaseOrder.map(id => <option key={id} value={id}>{ultrasoundCases[id].title} · rID {id}</option>)}</select></label><p>{clinicalCase.description} <a href={clinicalCase.source} target="_blank" rel="noreferrer">Ver caso ↗</a></p><a className="us-search-link" href="https://radiopaedia.org/search?scope=cases&q=ultrasound" target="_blank" rel="noreferrer">Buscar mais casos na Radiopaedia ↗</a></div>
    <div className="us-layout">
      <div className="us-body-panel">
        <div className="us-panel-title"><strong>Superfície do corpo</strong><small>Vista anterior · direita do paciente à esquerda</small></div>
        <div className="us-body-map" ref={bodyRef} onPointerDown={event => { if ((event.target as HTMLElement).closest('button')) return; event.currentTarget.setPointerCapture(event.pointerId); setDragging(true); moveProbe(event.clientX, event.clientY); }} onPointerMove={event => { if (dragging) moveProbe(event.clientX, event.clientY); }} onPointerUp={() => setDragging(false)} onPointerCancel={() => setDragging(false)}>
          <svg viewBox="0 0 300 440" role="img" aria-label="Esquema anterior do tronco humano" preserveAspectRatio="none">
            <defs><linearGradient id="usBodyGradient" x1="0" x2="1"><stop stopColor="#214456"/><stop offset=".5" stopColor="#467086"/><stop offset="1" stopColor="#214456"/></linearGradient></defs>
            <path d="M113 15 Q150 2 187 15 L206 46 Q228 56 247 76 Q261 100 262 140 L263 271 Q247 337 215 393 L194 429 L106 429 L85 393 Q53 337 37 271 L38 140 Q39 100 53 76 Q72 56 94 46 Z" fill="url(#usBodyGradient)" stroke="#79a7b4" strokeWidth="2"/>
            <path d="M98 55 Q150 80 202 55 M150 82 L150 390 M63 158 Q150 192 237 158 M78 268 Q150 293 222 268" fill="none" stroke="#8ab8c0" strokeOpacity=".24" strokeWidth="2"/>
            <path d="M90 149 Q108 126 155 154 Q159 193 128 213 Q102 201 86 177Z" fill="#607b55" opacity=".52"/><path d="M101 250 Q120 232 138 246 Q145 278 123 309 Q101 296 101 250Z" fill="#7297a1" opacity=".38"/><path d="M164 250 Q182 232 200 246 Q207 278 185 309 Q163 296 164 250Z" fill="#7297a1" opacity=".38"/><ellipse cx="150" cy="346" rx="28" ry="22" fill="#7297a1" opacity=".38"/>
            <text x="42" y="126" fill="#bdd9dd" fontSize="10">D</text><text x="249" y="126" fill="#bdd9dd" fontSize="10">E</text>
          </svg>
          {showGuide && ultrasoundZoneOrder.filter(id => clinicalCase.zoneViews[id]?.length).map(id => <button key={id} type="button" className={'us-hotspot ' + (zone === id ? 'active' : '')} style={{ left: `${ultrasoundZones[id].x * 100}%`, top: `${ultrasoundZones[id].y * 100}%` }} onClick={() => chooseZone(id)} title={ultrasoundZones[id].label} aria-label={`Selecionar ${ultrasoundZones[id].label}`}>{ultrasoundZones[id].label}</button>)}
          <div className={'us-probe ' + (dragging ? 'dragging' : '')} style={{ left: `${position.x * 100}%`, top: `${position.y * 100}%`, transform: `translate(-50%, -48%) rotate(${angle}deg)` }} aria-hidden="true"><span className="us-probe-handle"/><span className="us-probe-head"/><span className="us-beam"/></div>
        </div>
        <div className="us-map-help">Arraste sobre o tronco · toque nos rótulos para posicionar</div>
      </div>
      <div className="us-image-panel">
        <div className="us-panel-title"><strong>{region?.label ?? 'Fora da janela documentada'}</strong><small>{view?.label ?? 'Posicione o transdutor sobre uma região marcada'}</small></div>
        <div className="us-image-stage" aria-live="polite">
          {view ? <img key={view.image} src={view.image} alt={`Imagem real de ultrassom: ${view.organ}. ${view.label}. Caso da Radiopaedia por ${view.author}.`} style={{ filter: `brightness(${gain}%)` }} /> : <div className="us-no-window"><span>◉</span><strong>Sem imagem nesta posição</strong><p>Desloque o transdutor até uma das regiões marcadas.</p></div>}
          <div className="us-scan-label">{view ? `US · ${view.organ.toUpperCase()}` : 'US · SEM JANELA'}</div>
        </div>
        <div className="us-image-caption">{view ? <><strong>{view.label}</strong><p>{view.note}</p><span>Caso cortesia de {view.author}, <a href="https://radiopaedia.org" target="_blank" rel="noreferrer">Radiopaedia.org</a>, <a href={view.source} target="_blank" rel="noreferrer">rID {caseId} ↗</a></span></> : <p>A posição indicada é um guia anatômico esquemático.</p>}</div>
      </div>
    </div>
    <div className="us-controls">
      <label>Rotação do transdutor <strong>{angle}°</strong><input type="range" min="-90" max="90" value={angle} onChange={event => setAngle(Number(event.target.value))} aria-label="Rotação do transdutor" /></label>
      <label>Ganho da imagem <strong>{gain}%</strong><input type="range" min="65" max="140" value={gain} onChange={event => setGain(Number(event.target.value))} aria-label="Ganho da imagem" /></label>
      <button type="button" onClick={() => setShowGuide(value => !value)} aria-pressed={showGuide}>{showGuide ? 'Ocultar' : 'Mostrar'} regiões</button>
    </div>
    <div className="us-region-list" aria-label="Regiões para explorar">{ultrasoundZoneOrder.filter(id => clinicalCase.zoneViews[id]?.length).map(id => <button type="button" key={id} className={zone === id ? 'active' : ''} onClick={() => chooseZone(id)}>{ultrasoundZones[id].label}</button>)}</div>
    <p className="us-limitation"><strong>Como funciona:</strong> escolha um dos casos verificados acima. Posição e rotação selecionam apenas as vistas disponíveis naquele caso. A troca é discreta: as imagens não são uma sequência contínua nem têm coordenadas do transdutor. A inclinação não reconstrói tecido que não foi adquirido. O ganho altera apenas a visualização. A Radiopaedia informa que sua API não oferece download de conteúdo; novos casos precisam ser revisados e adicionados ao catálogo.</p>
  </section>;
}
