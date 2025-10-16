'use client';

import { PanelRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ArtifactToggle({ 
  isVisible, 
  onToggle 
}: { 
  isVisible: boolean;
  onToggle: () => void;
}) {
  const isArtifactOpen = isVisible;

  return (
    <Button
      variant="ghost"
      size="icon"
      className={`h-10 w-10 gap-2 text-sm font-normal hover:bg-accent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ${
        isArtifactOpen ? 'bg-accent text-accent-foreground' : ''
      }`}
      title={isArtifactOpen ? 'Close artifact panel' : 'Open artifact panel'}
      onClick={onToggle}
    >
      <PanelRight className="h-4 w-4" />
    </Button>
  );
}
