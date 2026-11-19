import { useEffect, useState } from 'react';
import type { DicomSeries } from './dicom';
import { fitLandmarks, type LandmarkFit } from './landmark-registration';

type Variant = 'male' | 'female';
type AtlasPoint = { point: number[]; label: string; variant: Variant };
type Registration = { matrix: number[]; modelVariant: Variant };
type Pair = { source: number[]; target: number[]; label: string };

type Props = {
  series: DicomSeries;
  atlasPoint?: AtlasPoint | null;
  targetPoint?: number[] | null;
  modelVariant: Variant;
  onRegistration: (result: Registration | null) => void;
};

const coordinates = (point: number[]) => point.map((value) => Math.round(value)).join(', ');
const coincides = (pair: Pair, source: number[], target: number[]) =>
  [pair.source, pair.target].some((point, index) =>
    Math.hypot(...point.map((value, axis) => value - (index === 0 ? source : target)[axis])) < 1);

export default function LandmarkPanel({ series, atlasPoint, targetPoint, modelVariant, onRegistration }: Props) {
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [checks, setChecks] = useState<Pair[]>([]);
  const [fit, setFit] = useState<LandmarkFit | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setPairs([]); setChecks([]); setFit(null); setError(''); onRegistration(null);
  }, [series, modelVariant, onRegistration]);

  const invalidate = (next: Pair[]) => {
    setPairs(next); setFit(null); setError(''); onRegistration(null);
  };
  const add = () => {
    if (!atlasPoint || atlasPoint.variant !== modelVariant || !targetPoint) return;
    if (checks.some(pair => coincides(pair, atlasPoint.point, targetPoint))) {
      setError('Remova o par da conferência antes de reaproveitá-lo no ajuste.');
      return;
    }
    invalidate([...pairs, { source: [...atlasPoint.point], target: [...targetPoint], label: atlasPoint.label }]);
  };
  const addCheck = () => {
    if (!atlasPoint || atlasPoint.variant !== modelVariant || !targetPoint || !fit) return;
    const reused = [...pairs, ...checks].some(pair => coincides(pair, atlasPoint.point, targetPoint));
    if (reused) { setError('Escolha um marco diferente dos pontos já usados no ajuste ou na conferência.'); return; }
    setChecks(current => [...current, { source: [...atlasPoint.point], target: [...targetPoint], label: atlasPoint.label }]);
    setError('');
  };
  const calculate = () => {
    try {
      const result = fitLandmarks(pairs.map((pair) => pair.source), pairs.map((pair) => pair.target));
      setFit(result); setError(''); onRegistration({ matrix: result.matrix, modelVariant });
    } catch (cause) {
      setFit(null); onRegistration(null);
      const message = cause instanceof Error ? cause.message : '';
      setError(message.includes('collinear') ? 'Escolha marcos mais afastados e fora de uma mesma linha.' : message.includes('duplicate') ? 'Há um ponto repetido. Remova o par duplicado e selecione outro marco.' : message.includes('reflection') ? 'Os pares indicam uma inversão de lados. Confira a correspondência e a lateralidade.' : 'Não foi possível ajustar os marcos. Confira as correspondências e selecione ao menos três pontos distintos.');
    }
  };
  const reset = () => { setChecks([]); invalidate([]); };
  const checkDistance = (pair: Pair) => {
    const m = fit!.matrix;
    return Math.hypot(...pair.target.map((target, i) =>
      m[i] * pair.source[0] + m[i + 4] * pair.source[1] + m[i + 8] * pair.source[2] + m[i + 12] - target));
  };

  return <section className="landmark-panel" aria-label="Registro manual por marcos">
    <header>
      <small>ALINHAMENTO APROXIMADO</small>
      <h3>Marcos correspondentes</h3>
      <p>Selecione o mesmo marco no atlas genérico e na imagem do paciente. O ajuste usa escala uniforme e rotação rígida; não é registro automático nem garante correspondência anatômica exata.</p>
    </header>
    <div className="image-tools">
      <span>Atlas: {atlasPoint?.variant === modelVariant ? `${atlasPoint.label} · ${coordinates(atlasPoint.point)} mm` : 'selecione um ponto no modelo'}</span>
      <span>Paciente: {targetPoint ? `${coordinates(targetPoint)} mm LPS` : 'selecione um ponto no corte'}</span>
      <button onClick={add} disabled={!atlasPoint || atlasPoint.variant !== modelVariant || !targetPoint}>Adicionar par</button>
      {fit && <button onClick={addCheck} disabled={!atlasPoint || atlasPoint.variant !== modelVariant || !targetPoint}>Conferir com novo marco</button>}
    </div>
    {fit && checks.length > 0 && <div>
      <h4>Marcos de conferência</h4>
      <p>Distâncias entre a posição projetada e o ponto escolhido no exame. Estes pares ficam fora do cálculo do ajuste.</p>
      <ul>{checks.map((pair, index) => <li key={index}>
        {pair.label} · <strong>{checkDistance(pair).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mm</strong>
        {' '}<button onClick={() => setChecks(current => current.filter((_, i) => i !== index))}>Remover da conferência</button>
      </li>)}</ul>
    </div>}
    {pairs.length > 0 && <ol>
      {pairs.map((pair, index) => <li key={`${index}-${pair.label}`}>
        <strong>{pair.label}</strong> — atlas [{coordinates(pair.source)}] → paciente [{coordinates(pair.target)}] mm
        {fit && <small> · resíduo {fit.residuals[index].toFixed(1)} mm</small>}
        <button aria-label={`Remover marco ${pair.label}`} onClick={() => invalidate(pairs.filter((_, item) => item !== index))}>Remover</button>
      </li>)}
    </ol>}
    <div className="image-tools">
      <button onClick={calculate} disabled={pairs.length < 3}>Ajustar com {pairs.length} marco{pairs.length === 1 ? '' : 's'}</button>
      <button onClick={reset} disabled={pairs.length === 0}>Reiniciar marcos</button>
      {fit && <strong>Distância RMS entre marcos: {fit.rmsMm.toFixed(1)} mm · escala {fit.scale.toFixed(4)}×</strong>}
    </div>
    {pairs.length > 0 && pairs.length < 3 && <p className="plane-status">Adicione pelo menos três marcos não colineares.</p>}
    {fit && <p>Uma distância pequena entre os marcos não mede o erro nas outras estruturas. Confira a sobreposição em vários cortes. O ajuste não deforma o modelo para reproduzir a anatomia individual.</p>}
    {error && <p className="error" role="alert">{error}</p>}
  </section>;
}
