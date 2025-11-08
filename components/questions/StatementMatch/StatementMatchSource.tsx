import { GoetheHeader } from '@/components/questions/MultipleChoice/GoetheHeader';
import type { SessionQuestion } from '@/lib/sessions/learning-session-context';

interface StatementMatchSourceProps {
  question: SessionQuestion;
}

export function StatementMatchSource({ question }: StatementMatchSourceProps) {
  const texts = question.texts ?? [];

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
