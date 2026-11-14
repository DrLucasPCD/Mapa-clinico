import { useState } from 'react';
import { ChevronRight, RotateCcw } from 'lucide-react';
import { ecgLeads, type LeadId } from './ecg-model';

type View = 'front' | 'side' | 'back';
type Electrode = { id: string; name: string; detail: string; view: View; x: number; y: number };
const limb = (id: string, name: string, detail: string, x: number, y: number): Electrode =>
  ({ id, name, detail, view: 'front', x, y });
const chest = (id: LeadId, view: View, x: number, y: number): Electrode =>
  ({ id, name: id, detail: ecgLeads[id].placement, view, x, y });

const sets = {
  '12 derivações': [
    limb('RA', 'RA · braço direito', 'Na face interna do antebraço direito, próximo ao punho.', 63, 222),
    limb('LA', 'LA · braço esquerdo', 'No mesmo nível do RA, no antebraço esquerdo, próximo ao punho.', 257, 222),
    limb('RL', 'RL · perna direita', 'Na perna direita, logo acima do tornozelo. É o eletrodo de referência do equipamento.', 129, 372),
    limb('LL', 'LL · perna esquerda', 'No mesmo nível do RL, na perna esquerda, logo acima do tornozelo.', 191, 372),
    chest('V1', 'front', 145, 121), chest('V2', 'front', 175, 121),
    chest('V4', 'front', 207, 151), chest('V3', 'front', 191, 136),
    chest('V5', 'side', 119, 151), chest('V6', 'side', 155, 151),
  ],
  Direitas: [chest('V4R', 'front', 113, 151), chest('V3R', 'front', 129, 136)],
  Posteriores: [chest('V7', 'back', 110, 151), chest('V8', 'back', 133, 151), chest('V9', 'back', 152, 151)],
} satisfies Record<string, Electrode[]>;
type Group = keyof typeof sets;

const views: Record<View, string> = { front: 'Frente', side: 'Lateral esquerda', back: 'Costas' };
const body = 'M143 37 Q144 52 137 57 L103 67 Q84 72 77 98 L65 152 L50 226 Q49 238 57 240 Q66 242 70 230 L91 167 L105 116 L109 152 L102 206 Q101 231 108 256 L112 302 L115 361 L115 378 Q105 393 109 399 L139 399 Q148 397 144 386 L144 330 L152 264 L160 238 L168 264 L176 330 L176 386 Q172 397 181 399 L211 399 Q215 393 205 378 L205 361 L208 302 L212 256 Q219 231 218 206 L211 152 L215 116 L229 167 L250 230 Q254 242 263 240 Q271 238 270 226 L255 152 L243 98 Q236 72 217 67 L183 57 Q176 52 177 37 Z';
const sideBody = 'M143 40 Q142 58 128 67 Q103 76 97 109 Q87 137 103 168 L116 202 Q116 224 109 251 L113 310 L117 373 Q103 390 104 399 L150 399 L151 346 L164 286 L178 250 Q192 218 193 191 L198 148 Q209 122 199 97 Q191 78 171 65 L169 40 Z';

function PatientOutline({ view }: { view: View }) {
  return <svg className="ecg-patient-outline" viewBox="0 0 320 420" role="img" aria-label={`Esquema do paciente, vista ${views[view].toLowerCase()}`}>
    <rect width="320" height="420" rx="16" fill="#eaf5f7" />
    <ellipse cx={view === 'side' ? 150 : 160} cy="27" rx="22" ry="25" fill="#d2e7ea" stroke="#8fb5c0" strokeWidth="2" />
    <path d={view === 'side' ? sideBody : body} fill="#d2e7ea" stroke="#8fb5c0" strokeWidth="2" />
    {view === 'front' && <>
      <path d="M160 80 Q129 65 101 82 M160 80 Q191 65 219 82 M160 82 V157" fill="none" stroke="#7c9ca8" strokeWidth="3" />
      {[89, 99, 109, 119, 132, 145, 157].map((y, index) => <path key={y} d={`M 155 ${y} Q 130 ${y + 2} ${107 - index * 1.2} ${y + 9} M 165 ${y} Q 190 ${y + 2} ${213 + index * 1.2} ${y + 9}`} stroke="#a9c7ce" strokeWidth="2" fill="none" />)}
      <path d="M113 73 V163 M207 73 V163" stroke="#729cab" strokeDasharray="4 4" fill="none" />
      <text x="51" y="75">D</text><text x="260" y="75">E</text>
    </>}
    {view === 'side' && <>
      <path d="M105 151 H191 M119 105 V169 M155 101 V169" stroke="#729cab" strokeDasharray="4 4" fill="none" />
      <text x="36" y="145">Anterior</text><text x="230" y="145">Posterior</text>
    </>}
    {view === 'back' && <>
      <path d="M160 73 V211 M110 104 V169 M133 89 V169 M152 87 V169 M107 151 H161" stroke="#729cab" strokeDasharray="4 4" fill="none" />
      <path d="M103 88 Q128 84 139 103 L132 139 Z M217 88 Q192 84 181 103 L188 139 Z" fill="none" stroke="#a2c0c9" strokeWidth="2" />
      <text x="51" y="75">E</text><text x="260" y="75">D</text>
    </>}
  </svg>;
}

export default function EcgPlacement({ initialLead }: { initialLead?: LeadId }) {
  const groupForLead = (Object.keys(sets) as Group[]).find(group => sets[group].some(item => item.id === initialLead)) ?? '12 derivações';
  const firstIndex = Math.max(0, sets[groupForLead].findIndex(item => item.id === initialLead));
  const [group, setGroup] = useState<Group>(groupForLead);
  const [practice, setPractice] = useState(false);
  const [index, setIndex] = useState(firstIndex);
  const [view, setView] = useState<View>(sets[groupForLead][firstIndex].view);
  const [feedback, setFeedback] = useState('');
  const items = sets[group];
  const active = items[index];
  const finished = index === items.length;

  function select(index: number) {
    setIndex(index);
    if (items[index]) setView(items[index].view);
    setFeedback('');
  }

  function reset(next: Group, train = practice) {
    setGroup(next);
    setPractice(train);
    setIndex(0);
    setView(sets[next][0].view);
    setFeedback('');
  }

  function mark(item: Electrode) {
    const candidate = items.indexOf(item);
    if (!practice || finished) return select(candidate);
    if (candidate !== index) {
      setFeedback('Tente outro ponto. Confira o lado do paciente e o marco anatômico.');
      return;
    }
    select(index + 1);
    setFeedback(candidate === items.length - 1 ? 'Montagem concluída.' : `${item.id} colocado corretamente.`);
  }

  return <div id="ecg-placement-guide" className="ecg-placement-guide">
    <div className="training-card">
      <h3>Prepare o paciente</h3>
      <p>Explique o exame, preserve a privacidade e coloque o paciente deitado, relaxado e com os braços apoiados. Limpe e seque a pele para que os eletrodos adiram. Peça que fique imóvel durante o registro.</p>
      <p>O ECG de 12 derivações usa <strong>10 eletrodos</strong>: quatro nos membros e seis no tórax. Identifique os cabos pelas siglas, pois a cor depende do padrão do aparelho.</p>
    </div>
    <div className="training-tabs" aria-label="Montagens do ECG">
      {(Object.keys(sets) as Group[]).map(item => <button key={item} aria-pressed={group === item} onClick={() => reset(item)}>{item}</button>)}
    </div>
    {group !== '12 derivações' && <p className="training-note">Montagem complementar. Registre as posições adicionais e identifique as derivações no traçado.</p>}
    <div className="ecg-pair">
      <div className="training-card ecg-patient">
        <div className="training-tabs" aria-label="Vista do paciente">
          {(Object.keys(views) as View[]).map(item => <button key={item} aria-pressed={view === item} onClick={() => setView(item)}>{views[item]}</button>)}
        </div>
        <div className="ecg-patient-map" data-view={view}>
          <PatientOutline view={view} />
          {items.filter(item => item.view === view).map(item => {
            const itemIndex = items.indexOf(item);
            const placed = practice && itemIndex < index;
            const showName = !practice || placed;
            return <button key={item.id} className="ecg-electrode"
              aria-label={showName ? item.name : `Ponto ${items.filter(entry => entry.view === view).indexOf(item) + 1}, vista ${views[view]}`}
              aria-pressed={!practice && item === active} disabled={placed}
              style={{ left: `${item.x / 3.2}%`, top: `${item.y / 4.2}%` }}
              onClick={() => mark(item)}>{showName ? item.id : '•'}</button>;
          })}
        </div>
        <p className="training-note">Esquema de superfície para localizar os marcos. D e E indicam os lados do paciente.</p>
      </div>
      <div className="training-card ecg-placement-details">
        <div className="training-tabs" aria-label="Modo de colocação">
          <button aria-pressed={!practice} onClick={() => reset(group, false)}>Guia</button>
          <button aria-pressed={practice} onClick={() => reset(group, true)}>Praticar colocação</button>
        </div>
        {practice && <progress aria-label="Eletrodos colocados" value={index} max={items.length} />}
        {finished ? <h3>{items.length} de {items.length} posições concluídas</h3> : <>
          <h3>{practice ? 'Coloque ' + active.name : active.name}</h3>
          {practice ? <details key={active.id}><summary>Ver marco anatômico</summary><p>{active.detail}</p></details> : <p>{active.detail}</p>}
        </>}
        {feedback && <p className="training-feedback" role="status">{feedback}</p>}
        {practice ? <button className="training-secondary" onClick={() => reset(group)}><RotateCcw size={16} /> Reiniciar prática</button> : <>
          <div className="training-tabs" aria-label="Selecionar eletrodo">
            {items.map((item, i) => <button key={item.id} aria-pressed={index === i} onClick={() => select(i)}>{item.id}</button>)}
          </div>
          <button className="training-secondary" disabled={index === items.length - 1} onClick={() => select(index + 1)}>Próximo eletrodo <ChevronRight size={16} /></button>
        </>}
        {group === '12 derivações' && <details><summary>Como contar os espaços intercostais</summary>
          <p>Palpe o ângulo do esterno, junto à segunda costela, e conte os espaços abaixo até encontrar o 4º para V1 e V2. Localize V4 no 5º espaço. Em seguida, coloque V3 entre V2 e V4 e mantenha V5 e V6 na mesma altura horizontal de V4.</p>
        </details>}
      </div>
    </div>
    <p className="training-note"><a href="https://doi.org/10.1161/CIRCULATIONAHA.106.180200" target="_blank" rel="noreferrer">Posicionamento padrão · AHA</a> · <a href="https://academic.oup.com/eurheartj/article/44/38/3720/7243210" target="_blank" rel="noreferrer">Derivações complementares · ESC</a></p>
  </div>;
}
