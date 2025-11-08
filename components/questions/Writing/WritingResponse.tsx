'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { QuestionComponentProps } from '@/components/questions/types';
import { cn } from '@/lib/utils';

export function WritingResponse({
  question,
  onAnswer,
}: Pick<QuestionComponentProps, 'question' | 'onAnswer'>) {
  const initialValue = typeof question.answer === 'string' ? question.answer : '';
  const [draft, setDraft] = useState(initialValue);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nextValue = typeof question.answer === 'string' ? question.answer : '';
    setDraft(nextValue);
    if (editorRef.current && editorRef.current.innerText !== nextValue) {
      editorRef.current.innerText = nextValue;
    }
  }, [question.id, question.answer]);

  const wordGuide = question.wordGuide;
  const wordCount = useMemo(() => {
    if (!draft.trim()) return 0;
    return draft.trim().split(/\s+/).length;
  }, [draft]);

  const handleInput = (event: React.FormEvent<HTMLDivElement>) => {
    const value = event.currentTarget.innerText;
    setDraft(value);
    onAnswer(value);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Aufgabe
        </p>
        <h2 className="text-xl font-semibold text-gray-900">
          {question.prompt}
        </h2>
        {question.writingPrompt?.goal && (
          <p className="text-sm text-muted-foreground">
            Ziel: {question.writingPrompt.goal}
          </p>
        )}
        {question.writingPrompt?.audience && (
          <p className="text-sm text-muted-foreground">
            Adressat: {question.writingPrompt.audience}
          </p>
        )}
      </div>

      {question.writingPrompt?.tasks && question.writingPrompt.tasks.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Beziehen Sie sich auf folgende Punkte:</p>
          <ul className="space-y-1 text-sm text-gray-700">
            {question.writingPrompt.tasks.map((task, index) => (
              <li key={index} className="leading-snug">
                • {task}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="relative">
        <div
          ref={editorRef}
          className={cn(
            'min-h-[220px] w-full whitespace-pre-wrap break-words text-base leading-6',
            'focus:outline-none',
            'border border-transparent rounded-xl px-4 py-3 transition-colors',
            'hover:border-border/60 focus:border-primary/40'
          )}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          data-placeholder="Schreiben Sie hier Ihren Text…"
        >
          {initialValue}
        </div>
        <span className="pointer-events-none absolute left-5 top-4 text-sm text-muted-foreground/60" hidden={draft.length > 0}>
          Schreiben Sie hier Ihren Text…
        </span>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Wörter: {wordCount}
            {wordGuide?.target ? ` / empfohlen ${wordGuide.target}` : ''}
          </span>
          {wordGuide?.min && (
            <span>Minimum: {wordGuide.min}</span>
          )}
        </div>
      </div>
    </div>
  );
}
