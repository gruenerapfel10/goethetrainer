import { GoetheHeader } from '@/components/questions/MultipleChoice/GoetheHeader';
import type { SessionQuestion } from '@/lib/sessions/learning-session-context';

interface StatementMatchSourceProps {
  question: SessionQuestion;
}

export function StatementMatchSource({ question }: StatementMatchSourceProps) {
  const texts = question.texts ?? [];
  const presentation = (question.presentation ?? {}) as {
    intro?: string;
    example?: {
      statement: string;
      answer: string;
      explanation?: string;
    };
  };

  return (
    <div className="space-y-8 text-sm leading-relaxed text-foreground">
      <div className="flex justify-center">
        <GoetheHeader />
      </div>

      <div className="space-y-1">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{question.theme}</div>
        <h1 className="text-xl font-bold text-foreground">{question.title}</h1>
        {question.subtitle && (
          <p className="text-base font-semibold text-foreground">{question.subtitle}</p>
        )}
      </div>

      {(question.prompt || presentation.intro || presentation.example) && (
        <div className="space-y-3 border border-dashed border-border/70 rounded-lg p-4 bg-muted/40">
          {question.prompt && (
            <p className="whitespace-pre-line font-medium text-foreground/90">{question.prompt}</p>
          )}
          {presentation.intro && (
            <p className="whitespace-pre-line text-foreground/80">{presentation.intro}</p>
          )}
          {presentation.example && (
            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between font-semibold">
                <span>Beispiel</span>
                <span>Lösung: {presentation.example.answer}</span>
              </div>
              <p>{presentation.example.statement}</p>
              {presentation.example.explanation && (
                <p className="text-xs text-muted-foreground">{presentation.example.explanation}</p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="space-y-6">
        {texts.map(text => (
          <article key={text.id} className="space-y-2">
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
            <p className="whitespace-pre-line text-foreground/90">{text.content}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
