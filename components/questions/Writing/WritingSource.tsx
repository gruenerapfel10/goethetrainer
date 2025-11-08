import type { Question } from '@/lib/sessions/questions/question-types';

export function WritingSource({ question }: { question: Question }) {
  const sections = question.sourceSections ?? [];

  if (!question.context && sections.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Keine Quelle vorhanden.</p>
    );
  }

  return (
    <div className="space-y-6 text-sm leading-relaxed text-gray-900">
      {sections.length > 0 ? (
        sections.map((section, index) => (
          <article key={`${section.title ?? 'section'}-${index}`} className="space-y-2">
            {section.title && (
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {section.title}
              </h3>
            )}
            <p className="whitespace-pre-line">{section.body}</p>
          </article>
        ))
      ) : (
        <p className="whitespace-pre-line">{question.context}</p>
      )}
    </div>
  );
}
