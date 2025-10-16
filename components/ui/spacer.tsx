import { cn } from '@/lib/utils';

interface SpacerProps {
  className?: string;
}

export function Spacer({ className }: SpacerProps) {
  return <div className={cn('flex-1', className)} />;
}