'use client';

import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { MCQCheckbox } from './MCQCheckbox';
import { GoetheHeader } from './GoetheHeader';
// import { QuestionTimeline } from './QuestionTimeline'; // TODO: Re-implement question timeline feature
import { QuestionStatus } from '@/lib/sessions/learning-session-context';
import type { Question as SessionQuestionType } from '@/lib/sessions/types';
import { SessionBoard } from '@/components/questions/SessionBoard';

 type MCQuestion = SessionQuestionType & {
   status?: QuestionStatus;
   exampleAnswer?: string;
 };
 
 interface AllQuestionsViewProps {
   questions: MCQuestion[];
   onSubmit: (answers: Record<string, string>) => Promise<void> | void;
   showA4Format?: boolean;
   isLastTeil?: boolean;
   accumulatedAnswers?: Record<string, string | string[] | boolean>;
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
 }
 
 export function AllQuestionsView({
   questions,
   onSubmit,
   showA4Format = true,
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
 }: AllQuestionsViewProps) {
   const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
   const [view, setView] = useState<'fragen' | 'quelle'>(activeView);
   const globalOrder = useMemo(() => {
     if (!allQuestions || allQuestions.length === 0) {
       return new Map<string, number>();
     }
     return new Map(allQuestions.map((question, index) => [question.id, index]));
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
 
   useEffect(() => {
     const next: Record<string, string> = {};
     questions.forEach(question => {
       const existing = accumulatedAnswers?.[question.id];
       if (typeof existing === 'string') {
         next[question.id] = existing;
       } else if (typeof question.answer === 'string') {
         next[question.id] = question.answer as string;
       } else if (question.isExample && question.exampleAnswer) {
         next[question.id] = question.exampleAnswer;
       }
     });
     setSelectedAnswers(next);
   }, [questions, accumulatedAnswers]);
 
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
 
   const isMultipleChoice = (questions[0] as any)?.registryType === 'multiple_choice' || false;
   const layoutVariant = questions[0]?.layoutVariant ?? null;
   const isSingleStatementLayout = layoutVariant === 'single_statement';
   const isHorizontalLayout = layoutVariant === 'horizontal' || (!layoutVariant && isMultipleChoice);
 
   const fragenContent = (
     <div className="space-y-10">
       <GoetheHeader />
       {questions.map((question, qIndex) => (
         <div key={`q-${qIndex}-${question.id}`} className="overflow-visible">
           <div className="flex gap-3 items-start overflow-visible">
             <div className="font-bold text-sm min-w-[30px] flex-shrink-0">
               {(globalOrder.get(question.id) ?? qIndex).toString()}
             </div>
             <div
               className={cn(
                 'flex flex-1',
                 isHorizontalLayout ? 'flex-row gap-8 flex-wrap items-center' : 'flex-col gap-3'
               )}
             >
               {question.options?.map((option, index) => {
                 const optionLetter = String.fromCharCode(97 + index);
                 const isExample = question.isExample === true;
                 const isSelected =
                   selectedAnswers[question.id] === option.id ||
                   (isExample && question.exampleAnswer === option.id);
                 const isFirstOption = index === 0;
 
                 return (
                   <div
                     key={option.id}
                     className={cn(
                       'relative',
                       isHorizontalLayout ? 'min-w-[140px]' : 'w-full'
                     )}
                   >
                     {isFirstOption && isExample && (
                       <div className="font-bold text-base absolute -top-8 left-0">Beispiel:</div>
                     )}
                     <div
                       className={cn(
                         'flex gap-2 transition-colors',
                         isHorizontalLayout ? 'items-center p-2 -m-2' : 'items-start p-2 -m-2',
                         isSingleStatementLayout && 'w-full border-b border-border/60 p-0 pb-2 mb-1',
                         !isExample && !isSubmitting
                           ? 'cursor-pointer hover:bg-muted rounded-md'
                           : 'cursor-default text-muted-foreground'
                       )}
                       onClick={() => handleSelectOption(question.id, option.id, isExample)}
                     >
                       <MCQCheckbox
                         letter={optionLetter}
                         checked={isSelected}
                         onChange={() => handleSelectOption(question.id, option.id, isExample)}
                         disabled={isSubmitting || isExample}
                         isExample={isExample}
                       />
                       <span
                         className={cn(
                           'text-sm break-words hyphens-auto',
                           isSingleStatementLayout && 'text-base leading-relaxed'
                         )}
                         lang="de"
                       >
                         {option.text}
                       </span>
                     </div>
                   </div>
                 );
               })}
             </div>
           </div>
         </div>
       ))}
     </div>
   );
 
   const quelleContent = (
     <div className="space-y-6">
       {questions[0]?.context ? (
         <>
           <GoetheHeader />
           <div className="flex items-start mb-8">
             <h3 className="font-bold text-base">{teilLabel}</h3>
             <span className="text-muted-foreground ml-20 font-normal text-base">
               Vorgeschlagene Arbeitszeit: 10 Minuten
             </span>
           </div>
           <p className="text-foreground mb-6 leading-relaxed font-normal text-sm" style={{ maxWidth: '40%' }}>
             Sie lesen in einer Zeitung einen Artikel über ein Unternehmen in der Tourismusbranche. Wählen Sie für jede Lücke die richtige Lösung.
           </p>
           <div className="border border-foreground/40 p-8">
             {questions[0]?.theme && (
               <p className="text-xs font-bold text-muted-foreground mb-4 uppercase tracking-wide">
                 {questions[0].theme}
               </p>
             )}
             {questions[0]?.title && (
               <h4 className="text-base font-bold mb-1 text-foreground text-center px-8">
                 {questions[0].title}
               </h4>
             )}
             {questions[0]?.subtitle && (
               <p className="text-base font-bold mb-6 text-foreground text-center px-8">
                 {questions[0].subtitle}
               </p>
             )}
             <p className="leading-7 text-foreground text-sm" style={{ lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
               {questions[0].context?.split(/(\[GAP_\d+\])/).map((part, idx) => {
                 const match = part.match(/\[GAP_(\d+)\]/);
                 if (match) {
                   const gapNumber = match[1];
                   const isExample = gapNumber === '0';
                   return (
                     <span
                       key={idx}
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
           </div>
         </>
       ) : (
         <p className="text-center text-muted-foreground py-12">Keine Quelle verfügbar</p>
       )}
     </div>
   );
 
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
       showSourceToggle={Boolean(questions[0]?.context)}
     />
   );
 }
