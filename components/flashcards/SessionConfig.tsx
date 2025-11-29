import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export type RunnerMode = 'finite' | 'infinite';
export type AlgorithmMode = 'faust' | 'sequential';

type SessionConfigProps = {
  runnerMode?: RunnerMode;
  onRunnerModeChange?: (mode: RunnerMode) => void;
  algorithm: AlgorithmMode;
  onAlgorithmChange: (algo: AlgorithmMode) => void;
  showRunnerToggle?: boolean;
  applyLabel?: string;
  onApply?: () => void;
  disabledApply?: boolean;
  className?: string;
};

export function SessionConfig({
  runnerMode = 'finite',
  onRunnerModeChange,
  algorithm,
  onAlgorithmChange,
  showRunnerToggle = true,
  applyLabel,
  onApply,
  disabledApply,
  className,
}: SessionConfigProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      {showRunnerToggle && (
        <>
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Runner</span>
          <Button
            size="sm"
            variant={runnerMode === 'finite' ? 'default' : 'outline'}
            className="rounded-full"
            onClick={() => onRunnerModeChange?.('finite')}
          >
            Finite
          </Button>
          <Button
            size="sm"
            variant={runnerMode === 'infinite' ? 'default' : 'outline'}
            className="rounded-full"
            onClick={() => onRunnerModeChange?.('infinite')}
          >
            Infinite
          </Button>
        </>
      )}

      <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Algorithm</span>
      <Button
        size="sm"
        variant={algorithm === 'faust' ? 'default' : 'outline'}
        className="rounded-full"
        onClick={() => onAlgorithmChange('faust')}
      >
        FAUST
      </Button>
      <Button
        size="sm"
        variant={algorithm === 'sequential' ? 'default' : 'outline'}
        className="rounded-full"
        onClick={() => onAlgorithmChange('sequential')}
      >
        Sequential
      </Button>

      {onApply ? (
        <Button size="sm" className="rounded-full" onClick={onApply} disabled={disabledApply}>
          {applyLabel ?? 'Apply'}
        </Button>
      ) : null}
    </div>
  );
}
