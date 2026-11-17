import { ArrowUpRight, BookOpen } from 'lucide-react';
import {
  anatomyReferences,
  anatomyVessel,
  getAnatomyDetail,
  relatedAnatomyTopics,
} from './anatomy-details';
import { lessonFor } from './content';
import {
  clinicalCorrelation,
  clinicalReferences,
  type ClinicalCorrelation,
} from './clinical-correlations';
import './anatomy-details.css';

export type AnatomyMetadata = {
  sourceId: string;
  latin?: string;
  hierarchy: readonly string[];
  aliases?: readonly string[];
};

const groups: Record<string, string> = {
  'Central nervous system': 'Sistema nervoso central',
  Brain: 'Encéfalo',
  Cerebrum: 'Cérebro',
  Telencephalon: 'Telencéfalo',
  Diencephalon: 'Diencéfalo',
  Cerebellum: 'Cerebelo',
  Brainstem: 'Tronco encefálico',
  'Frontal lobe': 'Lobo frontal',
  'Parietal lobe': 'Lobo parietal',
  'Temporal lobe': 'Lobo temporal',
  'Occipital lobe': 'Lobo occipital',
  'Ventricular system': 'Sistema ventricular',
  Heart: 'Coração',
  'Cardiac vessels': 'Vasos do coração',
  'Arteries of heart': 'Artérias do coração',
  'Veins of heart': 'Veias do coração',
  'Systemic arteries': 'Artérias sistêmicas',
  'Systemic veins': 'Veias sistêmicas',
};

const tabs = [
  ['anatomia', 'Anatomia'],
  ['funcao', 'Função'],
  ['clinica', 'Correlação clínica'],
] as const;

export default function AnatomyDetails({
  id,
  name,
  metadata,
  period,
  initial = 'anatomia',
  showTitle = true,
}: {
  id: string;
  name: string;
  metadata?: AnatomyMetadata;
  period?: number;
  initial?: (typeof tabs)[number][0];
  showTitle?: boolean;
}) {
  const detail = getAnatomyDetail(id);
  const lesson = lessonFor(id);
  const correlation = clinicalCorrelation(id, metadata?.sourceId);
  const vessel = metadata && anatomyVessel(metadata.sourceId);
  const topics = relatedAnatomyTopics(id, metadata?.aliases);
  const references = new Map<string, string>();
  if (detail)
    references.set(
      anatomyReferences[detail.reference],
      'OpenStax · Anatomia e fisiologia',
    );
  if (lesson && !references.has(lesson.source))
    references.set(lesson.source, 'Referência da aula');
  if (vessel)
    references.set(
      'https://openstax.org/books/anatomy-and-physiology-2e/pages/20-5-circulatory-pathways',
      'OpenStax · Vias circulatórias',
    );
  correlation?.references.forEach((key) => {
    const { label, url } = clinicalReferences[key];
    references.set(url, label);
  });
  topics.forEach((topic) => {
    if (!references.has(topic.reference))
      references.set(topic.reference, topic.title);
  });
  const text = detail
    ? {
        anatomia: detail.anatomy,
        funcao: detail.function,
        clinica: detail.clinic,
      }
    : lesson;
  const latin = metadata?.latin || lesson?.latin.split(' · ')[0];
  const imaging = detail?.imaging ?? lesson?.bridge;
  const level =
    period &&
    lesson?.levels[period <= 2 ? 0 : period <= 4 ? 1 : period <= 8 ? 2 : 3];
  const orderedTabs = [...tabs].sort(
    ([a], [b]) => Number(b === initial) - Number(a === initial),
  );

  return (
    <section
      className="anatomy-profile"
      aria-label={'Ficha anatômica · ' + name}
    >
      {showTitle && (
        <h3>
          <BookOpen size={20} /> {name}
        </h3>
      )}
      {latin && (
        <p className="anatomy-profile-latin">
          <em lang="la">{latin}</em>
        </p>
      )}
      {metadata?.hierarchy.length ? (
        <p className="anatomy-profile-path">
          {metadata.hierarchy.map((term) => groups[term] ?? term).join(' › ')}
        </p>
      ) : null}
      {detail && <p className="anatomy-profile-summary">{detail.short}</p>}
      {orderedTabs.map(([key, title]) => {
        const clinical = key === 'clinica' ? correlation : undefined;
        if (!text?.[key] && !clinical) return null;
        return (
          <details
            key={key}
            open={key === initial || Boolean(clinical && !text)}
          >
            <summary>{title}</summary>
            {clinical ? (
              <ClinicalReasoning correlation={clinical} />
            ) : (
              <p>{text?.[key]}</p>
            )}
            {key === 'anatomia' && lesson?.origin && (
              <dl className="anatomy-profile-attachments">
                <dt>Origem</dt>
                <dd>{lesson.origin}</dd>
                <dt>Inserção</dt>
                <dd>{lesson.insertion}</dd>
                <dt>Ação</dt>
                <dd>{lesson.action}</dd>
              </dl>
            )}
          </details>
        );
      })}
      {vessel && (
        <details open={!text}>
          <summary>Origem, território e ramos</summary>
          {vessel.parentVessel && (
            <p>
              <strong>Origem no roteiro.</strong> {vessel.parentVessel.name}.
            </p>
          )}
          <p>
            <strong>Território.</strong> {vessel.territory}
          </p>
          {vessel.branches.length > 0 && (
            <p>
              <strong>Ramos do roteiro.</strong>{' '}
              {vessel.branches.map((branch) => branch.name).join(' · ')}.
            </p>
          )}
        </details>
      )}
      {imaging && (
        <details>
          <summary>Como reconhecer na imagem</summary>
          <p>{imaging}</p>
        </details>
      )}
      {detail?.deeper?.map(({ title, text }) => (
        <details key={title}>
          <summary>{title}</summary>
          <p>{text}</p>
        </details>
      ))}
      {level && (
        <details>
          <summary>Para o seu período</summary>
          <p>{level}</p>
        </details>
      )}
      {topics.length > 0 && (
        <details open={!text && !vessel}>
          <summary>Roteiro de estudo relacionado</summary>
          {topics.map((topic) => (
            <div key={topic.id}>
              <h4>{topic.title}</h4>
              <ul>
                {topic.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <p>{topic.clinic}</p>
            </div>
          ))}
        </details>
      )}
      {!text && !vessel && !topics.length && !correlation && (
        <p>
          O atlas apresenta os dados anatômicos do catálogo para esta estrutura.
          A ficha clínica individual ainda está em elaboração.
        </p>
      )}
      {lesson?.audio && (
        <details>
          <summary>Ouvir introdução · Voz Faber</summary>
          {/* oxlint-disable-next-line jsx-a11y/media-has-caption -- Study text is provided in the same panel. */}
          <audio
            controls
            preload="none"
            src={'/audio/' + lesson.audio + '.wav'}
          />
        </details>
      )}
      {references.size > 0 && (
        <details>
          <summary>Referências</summary>
          <ul className="anatomy-profile-sources">
            {[...references].map(([url, label]) => (
              <li key={url}>
                <a href={url} target="_blank" rel="noreferrer">
                  {label} <ArrowUpRight size={13} />
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function ClinicalReasoning({
  correlation,
}: {
  correlation: ClinicalCorrelation;
}) {
  return (
    <div className="anatomy-clinical-reasoning">
      <h4>{correlation.title}</h4>
      <dl>
        <dt>Mecanismo e localização</dt>
        <dd>{correlation.mechanism}</dd>
        <dt>O que pesquisar no exame</dt>
        <dd>{correlation.exam}</dd>
        <dt>Como separar as hipóteses</dt>
        <dd>{correlation.distinction}</dd>
        <dt>Investigação e sinais de alarme</dt>
        <dd>{correlation.investigation}</dd>
      </dl>
      {correlation.exercise && (
        <div className="anatomy-clinical-exercise">
          <h5>Raciocine com o caso</h5>
          <p>{correlation.exercise.question}</p>
          <details>
            <summary>Revelar raciocínio</summary>
            <p>{correlation.exercise.explanation}</p>
          </details>
        </div>
      )}
    </div>
  );
}
