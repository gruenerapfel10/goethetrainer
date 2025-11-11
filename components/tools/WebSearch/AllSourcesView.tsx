'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { useIsMobile } from '../../../hooks/use-mobile';
import { useArtifactsContext } from '@/contexts/artifacts-context';
import type { SearchResult } from './utils';
import { SourcesList } from './SourcesList';

interface AllSourcesViewProps {
  sources: SearchResult[];
  id?: string;
}

export function AllSourcesView({ sources, id }: AllSourcesViewProps) {
  const { activeArtifact: artifact, artifactsState } = useArtifactsContext();
  const isArtifactVisible = artifactsState.isVisible;
  const isDesktop = !useIsMobile() || isArtifactVisible;

  const title = 'Web Sources';

  if (isDesktop) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <button id={id} className="hidden">
            Show All
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <SourcesList sources={sources} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <button id={id} className="hidden">
          Show All
        </button>
      </DrawerTrigger>
      <DrawerContent className="h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        <div className="p-4 overflow-y-auto">
          <SourcesList sources={sources} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}