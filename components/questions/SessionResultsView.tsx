'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { QuestionResult } from '@/lib/sessions/questions/question-types';
import { SessionTypeEnum } from '@/lib/sessions/session-registry';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronDown, ChevronRight } from 'lucide-react';
import { QuestionModuleId } from '@/lib/questions/modules/types';
import { getReadingAssessmentCategoryDefinition } from '@/lib/questions/assessment-categories';

interface SessionResultsViewProps {
  results: QuestionResult[];
  summary: {
    totalQuestions: number;
    answeredQuestions?: number;
    correctAnswers: number;
    incorrectAnswers: number;
    totalScore: number;
    maxScore: number;
    percentage: number;
    pendingManualReview?: number;
    teilBreakdown?: Array<{
      teilNumber: number;
      label: string;
      questionCount: number;
      correctAnswers: number;
      score: number;
      maxScore: number;
      percentage: number;
    }>;
    moduleBreakdown?: Array<{
      module: string;
      label: string;
      rawScore: number;
      rawMaxScore: number;
      scaledScore: number;
      scaledMaxScore: number;
      percentage: number;
      questionCount: number;
    }>;
  };
  sessionType: SessionTypeEnum;
  onClose?: () => void;
  issuedAt?: string | Date | null;
}

const MODULE_ORDER: SessionTypeEnum[] = [
  SessionTypeEnum.READING,
  SessionTypeEnum.LISTENING,
  SessionTypeEnum.WRITING,
  SessionTypeEnum.SPEAKING,
];

const MODULE_LABELS: Record<SessionTypeEnum, string> = {
  [SessionTypeEnum.READING]: 'Lesen',
  [SessionTypeEnum.LISTENING]: 'Hören',
  [SessionTypeEnum.WRITING]: 'Schreiben',
  [SessionTypeEnum.SPEAKING]: 'Sprechen',
};

const LEVEL_BADGE = 'GOETHE-ZERTIFIKAT C1';

const GRADE_BANDS = [
  { min: 90, label: 'sehr gut', color: 'text-green-700' },
  { min: 80, label: 'gut', color: 'text-emerald-600' },
  { min: 70, label: 'befriedigend', color: 'text-blue-600' },
  { min: 60, label: 'ausreichend', color: 'text-yellow-600' },
  { min: 0, label: 'nicht bestanden', color: 'text-red-600' },
];

function resolveGradeInfo(percentage: number) {
  return GRADE_BANDS.find(band => percentage >= band.min) ?? GRADE_BANDS[GRADE_BANDS.length - 1];
}

type OptionBreakdownEntry = {
  id: string;
  label: string;
  text: string;
  rationale?: string;
  misconception?: string;
  isCorrect: boolean;
};

function buildOptionBreakdown(question: QuestionResult['question']): OptionBreakdownEntry[] {
  const baseOptions =
    (question.options && question.options.length > 0
      ? question.options
      : question.gaps?.flatMap(gap => gap.options ?? []) ?? []) ?? [];
  if (!baseOptions.length) {
    return [];
  }

  const rationaleEntries =
    question.optionRationales ??
    (question.gaps ?? []).flatMap(gap => gap.optionRationales ?? []);

  return baseOptions.map((option, index) => {
    const optionId =
      (typeof option.id === 'string' && option.id.length > 0 ? option.id : undefined) ??
      `opt_${index}`;
    const rationale = rationaleEntries.find(entry => entry.optionId === optionId);
    const derivedLabel =
      optionId === '0'
        ? '0'
        : /^[a-z]$/i.test(optionId)
          ? optionId.toUpperCase()
          : String.fromCharCode(65 + index);

    const isCorrect =
      rationale?.isCorrect !== undefined
        ? rationale.isCorrect
        : optionId === question.correctOptionId ||
          (Array.isArray(question.correctAnswer)
            ? question.correctAnswer.includes(optionId)
            : false);

    return {
      id: optionId,
      label: derivedLabel,
      text: option.text ?? '',
      rationale: rationale?.rationale,
      misconception: rationale?.misconception,
      isCorrect,
    };
  });
}

function resolveQuestionCriterion(question: QuestionResult['question']): string | null {
  if (!question.assessmentCategory) {
    return null;
  }
  const definition = getReadingAssessmentCategoryDefinition(question.assessmentCategory);
  return definition?.label ?? question.assessmentCategory;
}

function resolveQuestionJustification(
  question: QuestionResult['question'],
  optionDetails: OptionBreakdownEntry[]
): string | null {
  if (typeof question.explanation === 'string' && question.explanation.trim().length > 0) {
    const parts = question.explanation
      .split('\n')
      .map(entry => entry.trim())
      .filter(Boolean);
    const preferred = parts.find(part => !part.toLowerCase().startsWith('kategorie'));
    return preferred ?? parts[0] ?? null;
  }

  const correctOption = optionDetails.find(entry => entry.isCorrect);
  return correctOption?.rationale ?? null;
}

export function SessionResultsView({ results, summary, sessionType, onClose, issuedAt }: SessionResultsViewProps) {
  const [expandedOptionRows, setExpandedOptionRows] = useState<Record<string, boolean>>({});

  const toggleOptionRow = (questionId: string) => {
    setExpandedOptionRows(prev => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  const moduleRows = MODULE_ORDER.map(module => {
    const row = summary.moduleBreakdown?.find(entry => entry.module === module);
    return (
      row ?? {
        module,
        label: MODULE_LABELS[module],
        rawScore: 0,
        rawMaxScore: 0,
        scaledScore: 0,
        scaledMaxScore: 25,
        percentage: 0,
        questionCount: 0,
      }
    );
  });

  const activeModules = moduleRows.filter(entry => entry.questionCount > 0);
  const overallScaledScore = activeModules.reduce((sum, entry) => sum + entry.scaledScore, 0);
  const overallScaledMax = activeModules.reduce((sum, entry) => sum + entry.scaledMaxScore, 0);
  const overallPercentage =
    overallScaledMax > 0 ? Math.round((overallScaledScore / overallScaledMax) * 100) : summary.percentage;
  const gradeInfo = resolveGradeInfo(overallPercentage);

  const issuedAtDate = (() => {
    if (!issuedAt) return new Date();
    const parsed = new Date(issuedAt);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  })();
  const teilBreakdown = summary.teilBreakdown ?? [];

  const formatAnswer = (question: QuestionResult['question'], value: unknown) => {
    if (value === null || value === undefined) {
      return '–';
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      return Object.values(value as Record<string, string>)
        .map(entry => entry || '–')
        .join(', ');
    }

    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : '–';
    }

    if (typeof value === 'boolean') {
      return value ? 'Ja' : 'Nein';
    }

    if (typeof value === 'string' && question.options?.length) {
      const optionIndex = question.options.findIndex(option => option.id === value);
      if (optionIndex >= 0) {
        const letter = String.fromCharCode(65 + optionIndex);
        return `${letter}) ${question.options[optionIndex].text}`;
      }
    }

    return String(value);
  };

  const resolveCorrectAnswer = (question: QuestionResult['question']) => {
    if (question.correctOptionId) {
      const optionIndex = question.options?.findIndex(option => option.id === question.correctOptionId) ?? -1;
      if (optionIndex >= 0 && question.options) {
        const letter = String.fromCharCode(65 + optionIndex);
        return `${letter}) ${question.options[optionIndex].text}`;
      }
      return question.correctOptionId;
    }
    if (Array.isArray(question.correctAnswer)) {
      return question.correctAnswer.join(', ');
    }
    if (typeof question.correctAnswer === 'object' && question.correctAnswer !== null) {
      return Object.values(question.correctAnswer as Record<string, string>).join(', ');
    }
    if (typeof question.correctAnswer === 'string') {
      return question.correctAnswer;
    }
    return '–';
  };

  const isStatementMatchQuestion = (question: QuestionResult['question']) => {
    const moduleId = (question.moduleId ?? question.registryType) as QuestionModuleId | undefined;
    return moduleId === QuestionModuleId.STATEMENT_MATCH;
  };

  const resolveStatementOptionLabel = (
    question: QuestionResult['question'],
    optionId?: string | null
  ) => {
    if (!optionId) {
      return '–';
    }
    if (optionId === '0') {
      return '0';
    }
    const option = question.options?.find(
      entry => entry.id === optionId || entry.text === optionId
    );
    const presentationPool = Array.isArray(
      (question.presentation as { sentencePool?: Array<{ id: string; text: string }> })?.sentencePool
    )
      ? ((question.presentation as { sentencePool?: Array<{ id: string; text: string }> })
          ?.sentencePool ?? [])
      : [];
    const poolEntry = presentationPool.find(entry => entry.id === optionId);
    if (poolEntry) {
      return `${poolEntry.id}) ${poolEntry.text}`;
    }
    return option?.text ?? optionId;
  };

  return (
    <div className="w-full h-full overflow-y-auto py-8 px-4">
      <div className="relative mx-auto max-w-5xl bg-white dark:bg-background border border-muted shadow-sm">
        <div className="border-b px-10 py-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">GOETHE-INSTITUT</p>
            <h1 className="text-2xl font-bold tracking-wide">{LEVEL_BADGE}</h1>
            <p className="text-xs text-muted-foreground mt-1">Modul: {MODULE_LABELS[sessionType]}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Ausstellungsdatum</p>
            <p className="text-sm font-semibold">
              {issuedAtDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="px-10 py-8 space-y-10">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2">
              <h2 className="text-sm font-semibold tracking-wide text-muted-foreground">ERGEBNISSE</h2>
              <div className="mt-3 border">
                <div className="grid grid-cols-4 text-xs uppercase text-muted-foreground bg-muted/40 px-4 py-2">
                  <span>Teilbereich</span>
                  <span className="text-right">Erreicht</span>
                  <span className="text-right">Max.</span>
                  <span className="text-right">%</span>
                </div>
                {moduleRows.map(row => (
                  <div
                    key={row.module}
                    className={cn(
                      'grid grid-cols-4 px-4 py-2 text-sm border-t',
                      row.module === sessionType
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/10 font-semibold'
                        : 'bg-transparent text-muted-foreground'
                    )}
                  >
                    <span>{row.label}</span>
                    <span className="text-right">{row.scaledScore}</span>
                    <span className="text-right">{row.scaledMaxScore}</span>
                    <span className="text-right">{row.percentage}%</span>
                  </div>
                ))}
                <div className="grid grid-cols-4 px-4 py-3 text-sm font-semibold border-t bg-muted/30">
                  <span>Gesamtpunkte</span>
                  <span className="text-right">{overallScaledScore}</span>
                  <span className="text-right">{overallScaledMax || summary.maxScore}</span>
                  <span className="text-right">{overallPercentage}%</span>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden border border-primary px-4 py-6 flex flex-col items-center justify-center text-center gap-3 bg-primary text-primary-foreground">
              <div className="absolute inset-0 pointer-events-none opacity-15">
                <div className="grid grid-cols-12 gap-x-1.5 gap-y-1 w-full h-full">
                  {Array.from({ length: 120 }).map((_, index) => (
                    <div
                      key={`logo-tile-${index}`}
                      className="flex items-center justify-center"
                    >
                      <Image
                        src="/logo_dark.png"
                        alt="Faust Logo"
                        width={20}
                        height={20}
                        className="w-5 h-5 object-contain dark:hidden"
                      />
                      <Image
                        src="/logo.png"
                        alt="Faust Logo"
                        width={20}
                        height={20}
                        className="w-5 h-5 object-contain hidden dark:block"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs uppercase tracking-[0.3em] text-primary-foreground/80 relative z-10">Prädikat</p>
              <p className="text-6xl font-black text-primary-foreground leading-none relative z-10">
                {overallPercentage}%
              </p>
              <p className={cn('text-2xl font-bold tracking-wide relative z-10', gradeInfo.color === 'text-red-600' ? 'text-primary-foreground' : 'text-primary-foreground') }>
                {gradeInfo.label}
              </p>
            </div>
          </div>

          {teilBreakdown.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold tracking-wide text-muted-foreground mb-3">
                Teil-Analyse
              </h2>
              <div className="flex flex-col gap-3">
                {teilBreakdown.map(teil => (
                  <div key={`${teil.teilNumber}-${teil.label}`} className="border px-4 py-3">
                    <div className="flex items-center justify-between text-base font-semibold">
                      <span>{teil.label}</span>
                      <span>{teil.score}/{teil.maxScore} Punkte</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground flex justify-between">
                      <span>{teil.correctAnswers}/{teil.questionCount} richtig</span>
                      <span>{teil.percentage}%</span>
                    </div>
                    <div className="mt-2 h-1.5 bg-muted rounded">
                      <div
                        className="h-full bg-emerald-500 rounded"
                        style={{ width: `${Math.min(100, teil.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {summary.teilBreakdown?.map(teil => {
            const teilResults = results.filter(result => {
              const label =
                result.question.layoutLabel ??
                (typeof result.question.teil === 'number' ? `Teil ${result.question.teil}` : undefined);
              return label === teil.label;
            });

            if (teilResults.length === 0) {
              return null;
            }
            const nextStep =
              teilResults.find(result => result.breakdown?.nextStep)?.breakdown?.nextStep ?? null;

            const criterionMap = new Map<
              string,
              {
                label: string;
                awarded: number;
                max: number;
                marks: number;
              }
            >();

            const markRows: Array<{
              criterion: string;
              mark: number;
              source: string;
              text: string;
              outcome: 'award' | 'reject';
            }> = [];

            teilResults.forEach(result => {
              result.breakdown?.criteria?.forEach(criterion => {
                const existing = criterionMap.get(criterion.id) ?? {
                  label: criterion.label ?? criterion.id,
                  awarded: 0,
                  max: 0,
                  marks: 0,
                };
                existing.awarded += criterion.awardedPoints;
                existing.max += criterion.maxPoints;
                existing.marks += criterion.decisions?.length ?? 0;
                criterionMap.set(criterion.id, existing);

                criterion.decisions
                  ?.sort((a, b) => a.markNumber - b.markNumber)
                  .forEach(decision => {
                    markRows.push({
                      criterion: criterion.label ?? criterion.id,
                      mark: decision.markNumber,
                      source: decision.source,
                      text: decision.justification,
                      outcome: decision.outcome,
                    });
                  });
              });
            });

            const renderedCriteria: string[] = [];

            const teilSection = (
              <div key={teil.label} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold tracking-tight">{teil.label}</h3>
                  <p className="text-base font-semibold">
                    {teil.score} / {teil.maxScore} Punkte
                  </p>
                </div>

                {nextStep && (
                  <div className="border-l-4 border-emerald-500 bg-emerald-50/70 dark:bg-emerald-900/10 px-3 py-2 text-xs text-emerald-900 dark:text-emerald-200">
                    <span className="font-semibold uppercase tracking-wide mr-2">Nächster Schritt:</span>
                    {nextStep}
                  </div>
                )}

                {Array.from(criterionMap.keys()).map(criterionId => {
                  const definition = criterionMap.get(criterionId);
                  const criterionMarks = markRows.filter(entry => entry.criterion === definition?.label);
                  if (!definition || criterionMarks.length === 0) {
                    return null;
                  }
                  renderedCriteria.push(criterionId);

                  return (
                    <div key={`${teil.label}-${criterionId}`} className="space-y-1 overflow-x-auto border rounded-md">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-muted-foreground bg-muted/20 uppercase tracking-wide text-[11px]">
                            <th className="px-2 py-2 w-24">
                              {definition.label}
                            </th>
                            <th className="px-2 py-2 text-right">
                              {definition.awarded} / {definition.max} Punkte
                            </th>
                            <th className="px-2 py-2 text-center" colSpan={2}>
                              {definition.marks} Marken
                            </th>
                          </tr>
                          <tr className="text-left text-muted-foreground bg-muted/30 uppercase tracking-wide text-[11px]">
                            <th className="px-2 py-2">Marke</th>
                            <th className="px-2 py-2">Quelle</th>
                            <th className="px-2 py-2" colSpan={2}>Entscheidung</th>
                          </tr>
                        </thead>
                        <tbody>
                          {criterionMarks.map((entry, idx) => (
                            <tr
                              key={`${teil.label}-${criterionId}-mark-${idx}`}
                              className={cn(
                                'border-t',
                                entry.outcome === 'award'
                                  ? 'bg-emerald-50/70 dark:bg-emerald-900/20'
                                  : 'bg-red-50/70 dark:bg-red-900/20'
                              )}
                            >
                              <td className="px-2 py-2 font-semibold">Mark {entry.mark}</td>
                              <td className="px-2 py-2 text-muted-foreground">„{entry.source}“</td>
                              <td className="px-2 py-2" colSpan={2}>
                                {entry.text}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}

                {renderedCriteria.length === 0 && teilResults.length > 0 && (
                  <div className="overflow-x-auto border rounded-md">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-muted-foreground bg-muted/30 uppercase tracking-wide text-[11px]">
                          <th className="px-2 py-2 w-12">Nr.</th>
                          <th className="px-2 py-2">Aufgabe</th>
                          <th className="px-2 py-2">Kriterium</th>
                          <th className="px-2 py-2">Begründung</th>
                          <th className="px-2 py-2">Antwort</th>
                          <th className="px-2 py-2">Korrekt</th>
                          <th className="px-2 py-2 text-right">Punkte</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          let rowIndex = 0;
                          return teilResults.flatMap(result => {
                            const question = result.question;
                            const isStatementMatch = isStatementMatchQuestion(question);

                            if (isStatementMatch && Array.isArray(question.statements)) {
                              const selections =
                                result.userAnswer.answer &&
                                typeof result.userAnswer.answer === 'object' &&
                                !Array.isArray(result.userAnswer.answer)
                                  ? (result.userAnswer.answer as Record<string, string>)
                                  : {};

                              return question.statements.map(statement => {
                                const userSelection = selections[statement.id];
                                const correctSelection = question.correctMatches?.[statement.id];
                                const isCorrect = userSelection === correctSelection;
                                rowIndex += 1;

                                return (
                                  <tr
                                    key={`${question.id}-${statement.id}`}
                                    className={cn(
                                      'border-t text-sm',
                                      isCorrect
                                        ? 'bg-emerald-50/70 dark:bg-emerald-900/20'
                                        : 'bg-red-50/70 dark:bg-red-900/10'
                                    )}
                                  >
                                    <td className="px-2 py-2 font-semibold">{rowIndex}</td>
                                    <td className="px-2 py-2 text-xs leading-snug">{statement.text}</td>
                                    <td className="px-2 py-2 text-xs text-muted-foreground">—</td>
                                    <td className="px-2 py-2 text-xs text-muted-foreground">—</td>
                                    <td className="px-2 py-2 font-medium">
                                      {resolveStatementOptionLabel(question, userSelection)}
                                    </td>
                                    <td className="px-2 py-2 text-muted-foreground">
                                      {resolveStatementOptionLabel(question, correctSelection)}
                                    </td>
                                    <td className="px-2 py-2 text-right font-semibold">
                                      {isCorrect ? '1 / 1' : '0 / 1'}
                                    </td>
                                  </tr>
                                );
                              });
                            }

                            rowIndex += 1;
                            const userAnswer = formatAnswer(question, result.userAnswer.answer);
                            const correctAnswer = resolveCorrectAnswer(question);
                            const optionDetails = buildOptionBreakdown(question);
                            const criterionLabel = resolveQuestionCriterion(question);
                            const justification = resolveQuestionJustification(
                              question,
                              optionDetails
                            );
                            const showOptionDetails = optionDetails.length > 0;
                            const isExpanded = !!expandedOptionRows[question.id];

                            return [
                              (
                                <tr
                                  key={`${question.id}-row`}
                                  className={cn(
                                    'border-t text-sm',
                                    result.isCorrect
                                      ? 'bg-emerald-50/70 dark:bg-emerald-900/20'
                                      : 'bg-red-50/70 dark:bg-red-900/10',
                                    showOptionDetails && 'cursor-pointer'
                                  )}
                                  onClick={() => {
                                    if (showOptionDetails) {
                                      toggleOptionRow(question.id);
                                    }
                                  }}
                                >
                                  <td className="px-2 py-2 font-semibold">{rowIndex}</td>
                                  <td className="px-2 py-2 text-xs leading-snug">
                                    <div className="flex items-start gap-2">
                                      {showOptionDetails && (
                                        <span className="text-muted-foreground mt-0.5" aria-hidden="true">
                                          {isExpanded ? (
                                            <ChevronDown className="w-4 h-4" />
                                          ) : (
                                            <ChevronRight className="w-4 h-4" />
                                          )}
                                        </span>
                                      )}
                                      <span>{question.prompt || 'Aufgabe'}</span>
                                    </div>
                                  </td>
                                  <td className="px-2 py-2 text-xs text-muted-foreground">
                                    {criterionLabel ?? '—'}
                                  </td>
                                  <td className="px-2 py-2 text-xs text-muted-foreground whitespace-pre-line">
                                    {justification ?? '—'}
                                  </td>
                                  <td className="px-2 py-2 font-medium">{userAnswer}</td>
                                  <td className="px-2 py-2 text-muted-foreground">{correctAnswer}</td>
                                  <td className="px-2 py-2 text-right font-semibold">
                                    {result.score} / {result.maxScore}
                                  </td>
                                </tr>
                              ),
                              showOptionDetails && isExpanded ? (
                                <tr
                                  key={`${question.id}-details`}
                                  className="border-t bg-muted/40 text-xs text-foreground"
                                >
                                  <td colSpan={7} className="px-4 py-3">
                                    <div className="space-y-2">
                                      {optionDetails.map(option => (
                                        <div
                                          key={`${question.id}-opt-${option.id}`}
                                          className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
                                        >
                                          <span
                                            className={cn(
                                              'font-semibold',
                                              option.isCorrect
                                                ? 'text-emerald-700'
                                                : 'text-red-600'
                                            )}
                                          >
                                            {option.label}) {option.text}
                                          </span>
                                          <div className="text-muted-foreground flex-1 whitespace-pre-line">
                                            {option.rationale ?? 'Keine Begründung hinterlegt.'}
                                            {option.misconception && (
                                              <div className="text-[11px] italic text-amber-700 mt-1">
                                                Fehlannahme: {option.misconception}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              ) : null,
                            ];
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );

            return teilSection;
          })}

          {onClose && (
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 border border-muted hover:bg-muted/50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Zurück zur Übersicht
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
