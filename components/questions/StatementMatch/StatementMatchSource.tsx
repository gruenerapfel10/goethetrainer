import { GoetheHeader } from '@/components/questions/MultipleChoice/GoetheHeader';
import type { SessionQuestion } from '@/lib/sessions/learning-session-context';
import { cn } from '@/lib/utils';
import { SavedWordHighlighter } from '@/components/questions/SessionBoard';

interface StatementMatchSourceProps {
  question: SessionQuestion;
  teilLabel?: string;
  workingTime?: string;
  highlightWords?: string[];
}

const DEFAULT_WORKING_TIMES: Record<string, string> = {
  'Teil 3': '20 Minuten',
  'Teil 4': '15 Minuten',
};

export function StatementMatchSource({
  question,
  teilLabel,
  workingTime,
  highlightWords = [],
}: StatementMatchSourceProps) {
  const texts = question.texts ?? [];
  const presentation = (question.presentation ?? {}) as {
    intro?: string;
    example?: {
      statement: string;
      answer: string;
      explanation?: string;
    };
    sentencePool?: Array<{ id: string; text: string }>;
  };
  const resolvedTeilLabel =
    teilLabel ??
    question.layoutLabel ??
    (typeof question.teil === 'number' ? `Teil ${question.teil}` : 'Teil');
  const resolvedWorkingTime =
    workingTime ??
    DEFAULT_WORKING_TIMES[resolvedTeilLabel as keyof typeof DEFAULT_WORKING_TIMES] ??
    '15 Minuten';
  const sectionLabel =
    (question.renderConfig as { sectionLabel?: string } | undefined)?.sectionLabel ?? 'LESEN';
  const summaryText =
    presentation.intro ??
    question.prompt ??
    'Sie lesen einen Kommentar. Ordnen Sie die passenden Informationen zu.';
  const hasGapMarkers = Boolean(question.context && /\[GAP_\d+\]/.test(question.context ?? ''));
  const presentationMode =
    (question.presentation as { mode?: string } | undefined)?.mode ?? null;
  const showSentencePool =
    presentationMode !== 'sentence_pool' && Array.isArray(presentation.sentencePool);

  return (
    <div className="space-y-6 text-sm leading-relaxed text-foreground">
      <GoetheHeader sectionLabel={sectionLabel} />

      <div className="flex items-start">
        <h3 className="font-bold text-base">{resolvedTeilLabel}</h3>
        <span className="text-muted-foreground ml-20 font-normal text-base">
          Vorgeschlagene Arbeitszeit: {resolvedWorkingTime}
        </span>
      </div>

      <p className="text-foreground leading-relaxed">
        <SavedWordHighlighter words={highlightWords}>{summaryText}</SavedWordHighlighter>
      </p>

      <div className="border border-foreground/40 p-8 space-y-4">
        {question.theme && (
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
            {question.theme}
          </p>
        )}
        {question.title && (
          <h4 className="text-base font-bold text-center text-foreground">{question.title}</h4>
        )}
        {question.subtitle && (
          <p className="text-base font-semibold text-center text-foreground">
            {question.subtitle}
          </p>
        )}
        {question.context && (
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            <SavedWordHighlighter words={highlightWords}>
              {renderContext(question.context, hasGapMarkers)}
            </SavedWordHighlighter>
          </div>
        )}
      </div>

      {showSentencePool && presentation.sentencePool && (
        <div className="border border-foreground/30 p-6 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Satzliste
          </p>
          <ol className="space-y-2 list-decimal list-inside text-sm">
            {presentation.sentencePool.map(sentence => (
              <li key={sentence.id}>
                <span className="font-semibold mr-1">{sentence.id}.</span>
                <span>
                  <SavedWordHighlighter words={highlightWords}>{sentence.text}</SavedWordHighlighter>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {presentation.example && resolvedTeilLabel !== 'Teil 4' && (
        <div className="border border-foreground/30 p-6 space-y-2 text-sm">
          <div className="flex items-center justify-between font-semibold">
            <span>Beispiel</span>
            <span>Lösung: {presentation.example.answer}</span>
          </div>
          <p>
            <SavedWordHighlighter words={highlightWords}>
              {presentation.example.statement}
            </SavedWordHighlighter>
          </p>
          {presentation.example.explanation && (
            <p className="text-xs text-muted-foreground">{presentation.example.explanation}</p>
          )}
        </div>
      )}

      {texts.length > 0 && (
        <div className="space-y-4">
          {texts.map(text => (
            <article key={text.id} className="border border-foreground/40 p-6 space-y-2">
              <header>
                <div className="text-sm font-semibold text-foreground">
                  {text.id} {text.label}
                </div>
                {text.role && (
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    {text.role}
                  </div>
                )}
              </header>
              <p className="whitespace-pre-line text-foreground/90">
                <SavedWordHighlighter words={highlightWords}>{text.content}</SavedWordHighlighter>
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function renderContext(context: string, hasGapMarkers: boolean) {
  if (!hasGapMarkers) {
    return <p>{context}</p>;
  }

  return (
    <p className="leading-7 text-foreground text-sm whitespace-pre-wrap">
      {context.split(/(\[GAP_\d+\])/).map((part, idx) => {
        const match = part.match(/\[GAP_(\d+)\]/);
        if (match) {
          const gapNumber = match[1];
          return (
            <span
              key={`${part}-${idx}`}
              className={cn(
                'inline-flex items-center justify-center border border-foreground/40 px-2 py-0.5 mx-1 text-xs font-semibold tracking-wide'
              )}
            >
              {gapNumber}
              <span className="mx-1">…</span>
            </span>
          );
        }
        return part;
      })}
    </p>
  );
}
