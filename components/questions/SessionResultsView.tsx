'use client';

import { QuestionResult } from '@/lib/sessions/questions/question-types';
import { SessionTypeEnum } from '@/lib/sessions/session-registry';
import { cn } from '@/lib/utils';
import { Award, CheckCircle2, ChevronLeft, Circle, XCircle } from 'lucide-react';

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

export function SessionResultsView({ results, summary, sessionType, onClose }: SessionResultsViewProps) {
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

  const issuedAt = new Date();
  const teilBreakdown = summary.teilBreakdown ?? [];

  return (
    <div className="w-full h-full overflow-y-auto bg-muted/30 py-8 px-4">
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
              {issuedAt.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
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
            <div className="border px-4 py-6 flex flex-col items-center justify-center text-center gap-2">
              <Award className="w-10 h-10 text-emerald-600" />
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Prädikat</p>
              <p className={cn('text-2xl font-bold tracking-wide', gradeInfo.color)}>
                {gradeInfo.label}
              </p>
              <p className="text-sm text-muted-foreground">{overallPercentage}%</p>
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

            return (
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
              </div>
            );
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
