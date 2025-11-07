import { GoetheHeader } from '@/components/questions/MultipleChoice/GoetheHeader';
import type { SessionQuestion } from '@/lib/sessions/learning-session-context';

interface StatementMatchSourceProps {
  question: SessionQuestion;
}

export function StatementMatchSource({ question }: StatementMatchSourceProps) {
  const texts = question.texts ?? [];

  return (
    <div className="space-y-8 text-sm leading-relaxed text-gray-900">
      <div className="flex justify-center">
        <GoetheHeader />
      </div>

      <div className="space-y-1">
        <div className="text-xs uppercase tracking-widest text-gray-500">{question.theme}</div>
        <h1 className="text-xl font-bold">{question.title}</h1>
        {question.subtitle && (
          <p className="text-base font-semibold">{question.subtitle}</p>
        )}
      </div>

      <div className="space-y-6">
        {texts.map(text => (
          <article key={text.id} className="space-y-2">
            <header>
              <div className="text-sm font-semibold">
                {text.id} {text.label}
              </div>
              {text.role && (
                <div className="text-xs uppercase tracking-wide text-gray-600">
                  {text.role}
                </div>
              )}
            </header>
            <p className="whitespace-pre-line">{text.content}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
