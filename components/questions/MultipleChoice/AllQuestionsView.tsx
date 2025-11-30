'use client';

import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { MCQCheckbox } from './MCQCheckbox';
import { GoetheHeader } from './GoetheHeader';
// import { QuestionTimeline } from './QuestionTimeline'; // TODO: Re-implement question timeline feature
import type { QuestionStatus } from '@/lib/sessions/learning-session-context';
import type { Question as SessionQuestionType } from '@/lib/sessions/types';
import { SessionBoard } from '@/components/questions/SessionBoard';
import { SessionTypeEnum } from '@/lib/sessions/session-registry';
import { AudioSourcePlayer } from '@/components/questions/media/AudioSourcePlayer';

 type MCQuestion = SessionQuestionType & {
   status?: QuestionStatus;
   exampleAnswer?: string;
 };
 
interface AllQuestionsViewProps {
  questions: MCQuestion[];
  onSubmit: (answers: Record<string, string>) => Promise<void> | void;
  showA4Format?: boolean;
  onShowA4FormatChange?: (show: boolean) => void;
  isLastTeil?: boolean;
  accumulatedAnswers?: Record<string, any>;
  onBack?: () => void;
  showBackButton?: boolean;
   totalTeils?: number;
   generatedTeils?: Set<number>;
  onTeilNavigate?: (teilNumber: number) => void;
  allQuestions?: MCQuestion[];
  onAnswerChange?: (questionId: string, answer: string) => void;
  isSubmitting?: boolean;
  activeView?: 'fragen' | 'quelle';
  onActiveViewChange?: (view: 'fragen' | 'quelle') => void;
  onEndSession?: () => void;
}

export function AllQuestionsView({
  questions,
  onSubmit,
  showA4Format = true,
  onShowA4FormatChange,
  isLastTeil = true,
   accumulatedAnswers = {},
   onBack,
   showBackButton = false,
   totalTeils = 1,
   generatedTeils = new Set([1]),
  onTeilNavigate,
  allQuestions,
  onAnswerChange,
  isSubmitting = false,
  activeView = 'fragen',
  onActiveViewChange,
  onEndSession,
}: AllQuestionsViewProps) {
   const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const primaryQuestion = questions[0];
  const renderConfig = (primaryQuestion?.renderConfig ?? {}) as Record<string, any>;
  const sessionType = primaryQuestion?.sessionType ?? SessionTypeEnum.READING;
  const isListening = sessionType === SessionTypeEnum.LISTENING;
   const sectionLabel = renderConfig.sectionLabel ?? (sessionType === SessionTypeEnum.LISTENING ? 'HÖREN' : 'LESEN');
   const workingTime = renderConfig.workingTime ?? primaryQuestion?.workingTime ?? '10 Minuten';
   const defaultReadingSummary = 'Sie lesen einen Artikel. Wählen Sie für jede Aufgabe die passende Lösung.';
   const defaultListeningSummary = 'Sie hören einen Hörtext. Treffen Sie für jede Aussage die richtige Entscheidung.';
   const sourceSummary = renderConfig.sourceSummary ?? (sessionType === SessionTypeEnum.LISTENING ? defaultListeningSummary : defaultReadingSummary);
   const audioSource = primaryQuestion?.audioSource;
   const showAudioSource = Boolean(audioSource && (renderConfig.showAudioControls ?? true));
  const contextBody = isListening ? '' : primaryQuestion?.context ?? audioSource?.transcript ?? '';
  const hasGapMarkers = Boolean(!isListening && primaryQuestion?.context && /\[GAP_\d+\]/.test(primaryQuestion.context));
   const [view, setView] = useState<'fragen' | 'quelle'>(activeView);
  const globalOrder = useMemo(() => {
    if (!allQuestions || allQuestions.length === 0) {
      return new Map<string, number>();
    }
    // Skip example questions in numbering: start at 1 for the first non-example
    let counter = 1;
    const entries: Array<[string, number]> = [];
    allQuestions.forEach(question => {
      if (question.isExample) {
        entries.push([question.id, 0]);
      } else {
        entries.push([question.id, counter]);
        counter += 1;
      }
    });
    return new Map(entries);
  }, [allQuestions]);
 
   useEffect(() => {
     const handleKeyDown = (e: KeyboardEvent) => {
       if (e.key === 'Tab') {
         e.preventDefault();
         setView(prev => (prev === 'fragen' ? 'quelle' : 'fragen'));
       }
     };
 
     window.addEventListener('keydown', handleKeyDown);
     return () => window.removeEventListener('keydown', handleKeyDown);
   }, []);
 
   useEffect(() => {
     if (activeView !== view) {
       setView(activeView);
     }
   }, [activeView]);
 
   useEffect(() => {
     onActiveViewChange?.(view);
   }, [view, onActiveViewChange]);
 
  const questionKey = useMemo(
    () => questions.map(question => question.id).join('|'),
    [questions]
  );

  const toSingleSelection = (question: MCQuestion, value: unknown) => {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') {
      const gaps = (question as any).gaps ?? [];
      if (gaps.length > 0) {
        const firstGapId = gaps[0]?.id;
        if (firstGapId && typeof (value as any)[firstGapId] === 'string') {
          return (value as any)[firstGapId] as string;
        }
        const first = Object.values(value as Record<string, unknown>)[0];
        if (typeof first === 'string') {
          return first;
        }
      }
    }
    return '';
  };

  useEffect(() => {
    const initial: Record<string, string> = {};
    questions.forEach(question => {
      if (question.isExample) {
        // Don't show example options nor prefill them into the user's answers
        return;
      }
      const value = toSingleSelection(question, question.answer);
      if (value) {
        initial[question.id] = value;
      }
    });
    setSelectedAnswers(initial);
  }, [questionKey]);

  useEffect(() => {
    if (!accumulatedAnswers) {
      return;
    }
    setSelectedAnswers(prev => {
      let changed = false;
      const next = { ...prev };
      Object.entries(accumulatedAnswers).forEach(([questionId, value]) => {
        const question = questions.find(q => q.id === questionId);
        const resolved = question ? toSingleSelection(question, value) : '';
        if (resolved && next[questionId] !== resolved) {
          next[questionId] = resolved;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [accumulatedAnswers]);
 
   const handleSelectOption = (questionId: string, optionId: string, isExample: boolean) => {
     if (isSubmitting || isExample) return;
     setSelectedAnswers(prev => ({
       ...prev,
       [questionId]: optionId
     }));
     onAnswerChange?.(questionId, optionId);
   };
 
   const handleSubmit = async () => {
     try {
       await onSubmit(selectedAnswers);
     } catch (error) {
       console.error('Failed to submit answers:', error);
     }
   };
 
   const requiredAnswered = questions
     .filter(q => !q.isExample)
     .every(q => selectedAnswers[q.id]);
 
   const timelineQuestions = allQuestions && allQuestions.length > 0 ? allQuestions : questions;
   const teilNumber = (questions[0] as any)?.teil || 1;
   const teilLabel = questions[0]?.layoutLabel ?? `Teil ${teilNumber}`;
   const teils = new Set(timelineQuestions.map(q => (q as any).teil || 1));
   const derivedTotalTeils = teils.size;
   const actualTotalTeils = totalTeils || derivedTotalTeils;
   const teilLabels = Array.from({ length: actualTotalTeils }, (_, index) => index + 1).reduce(
     (acc, number) => ({ ...acc, [number]: `Teil ${number}` }),
     {} as Record<number, string>
   );
 
   const layoutVariant = questions[0]?.layoutVariant ?? null;
   const renderLayout = (questions[0]?.renderConfig as { layout?: string } | undefined)?.layout ?? layoutVariant;
   const isSingleStatementLayout = renderLayout === 'single_statement';
   const isHorizontalLayout = renderLayout === 'horizontal';
 
  const fragenContent = (
    <div className="space-y-10">
      <GoetheHeader sectionLabel={sectionLabel} />
       {questions.map((question, qIndex) => {
         const optionLayout = question.renderConfig?.layout ?? renderLayout;
         const isHorizontal = optionLayout === 'horizontal';
        const isExample = question.isExample === true;

         return (
           <div
             key={`q-${qIndex}-${question.id}`}
             className="overflow-visible border-border/60 last:border-b-0 py-4"
           >
             <div className="grid grid-cols-[minmax(28px,40px)_1fr] gap-4">
               <div className="font-bold text-sm text-right pt-1">
                 {(globalOrder.get(question.id) ?? qIndex + 1).toString()}
               </div>
               <div className="space-y-3">
                 {isExample && (
                   <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                     Beispiel (nicht nummeriert)
                   </div>
                 )}
                 <div
                   className={cn(
                     isHorizontal ? 'grid gap-4' : 'flex flex-col gap-2'
                   )}
                   style={isHorizontal ? {
                     gridTemplateColumns: `repeat(${question.options?.length ?? 1}, minmax(0, 1fr))`
                   } : undefined}
                 >
                   {question.options?.map((option, index) => {
                     const optionLetter = String.fromCharCode(97 + index);
                     const isSelected =
                       selectedAnswers[question.id] === option.id ||
                       (isExample && question.exampleAnswer === option.id);

                     return (
                       <div
                         key={option.id}
                         className={cn(
                           'relative flex gap-2 items-start rounded-md',
                           isHorizontal ? 'py-1 px-2' : 'p-2 -m-2',
                           !isExample && !isSubmitting && 'cursor-pointer hover:bg-muted'
                         )}
                         onClick={(!isExample && !isSubmitting)
                           ? () => handleSelectOption(question.id, option.id, isExample)
                           : undefined}
                       >
                         <MCQCheckbox
                           letter={optionLetter}
                           checked={isSelected}
                           onChange={() => handleSelectOption(question.id, option.id, isExample)}
                           disabled={isSubmitting || isExample}
                           isExample={isExample}
                         />
                         <span className="text-sm leading-snug" lang="de">
                           {option.text}
                         </span>
                       </div>
                     );
                   })}
                 </div>
               </div>
             </div>
           </div>
         );
       })}
     </div>
   );
 
  const renderContextBody = () => {
    if (!contextBody) return null;
    if (hasGapMarkers && primaryQuestion?.context) {
      return (
        <p className="leading-7 text-foreground text-sm" style={{ lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
          {primaryQuestion.context.split(/(\[GAP_\d+\])/).map((part, idx) => {
            const match = part.match(/\[GAP_(\d+)\]/);
            if (match) {
              const gapNumber = match[1];
              const isExample = gapNumber === '0';
              return (
                <span
                  key={`${part}-${idx}`}
                  className="inline-block border border-foreground px-2 py-0 mx-1 text-foreground align-middle"
                  style={{ lineHeight: '1.2' }}
                >
                  {isExample ? (
                    <span className="font-bold">Beispiel 0</span>
                  ) : (
                    <>
                      <span className="font-bold">{gapNumber}</span> ...
                    </>
                  )}
                </span>
              );
            }
            return part;
          })}
        </p>
      );
    }
    return (
      <p className="leading-7 text-foreground text-sm" style={{ lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
        {contextBody}
      </p>
    );
  };

  const hasSourceContent = (!isListening && Boolean(contextBody)) || (showAudioSource && audioSource);
  const quelleContent = (
    <div className="space-y-6">
      {hasSourceContent ? (
        <>
          <GoetheHeader sectionLabel={sectionLabel} />
          <div className="flex items-start mb-8">
            <h3 className="font-bold text-base">{teilLabel}</h3>
            <span className="text-muted-foreground ml-20 font-normal text-base">
              Vorgeschlagene Arbeitszeit: {workingTime}
            </span>
          </div>
          {isListening ? (
            showAudioSource && audioSource ? (
              <AudioSourcePlayer source={audioSource} />
            ) : (
              <p className="text-center text-muted-foreground py-12">Audioquelle wird vorbereitet …</p>
            )
          ) : (
            <>
              <p className="text-foreground mb-6 leading-relaxed font-normal text-sm" style={{ maxWidth: '70%' }}>
                {sourceSummary}
              </p>
              {contextBody && (
                <div className="border border-foreground/40 p-8 space-y-4">
                  {primaryQuestion?.theme && (
                    <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">
                      {primaryQuestion.theme}
                    </p>
                  )}
                  {primaryQuestion?.title && (
                    <h4 className="text-base font-bold text-foreground text-center px-8">
                      {primaryQuestion.title}
                    </h4>
                  )}
                  {primaryQuestion?.subtitle && (
                    <p className="text-base font-bold text-foreground text-center px-8">
                      {primaryQuestion.subtitle}
                    </p>
                  )}
                  {renderContextBody()}
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <p className="text-center text-muted-foreground py-12">Keine Quelle verfügbar</p>
      )}
    </div>
  );
  const showSourceToggle = Boolean((renderConfig.showSourceToggle ?? hasSourceContent) && hasSourceContent);
 
   const canSubmitTeil = requiredAnswered;
 
   return (
    <SessionBoard
      teilNumber={teilNumber}
       teilLabel={teilLabel}
       teilLabels={teilLabels}
       totalTeils={actualTotalTeils}
       generatedTeils={generatedTeils}
       onTeilNavigate={onTeilNavigate}
       showBackButton={showBackButton}
       onBack={onBack}
       isSubmitting={isSubmitting}
       isLastTeil={isLastTeil}
       canSubmit={canSubmitTeil}
       onSubmit={handleSubmit}
       activeView={view}
       onActiveViewChange={setView}
       frageContent={fragenContent}
       quelleContent={quelleContent}
      showSourceToggle={showSourceToggle}
      showA4Format={showA4Format}
      onShowA4FormatChange={onShowA4FormatChange}
      onEndSession={onEndSession}
      sourceReference={primaryQuestion?.sourceReference}
    />
  );
}
