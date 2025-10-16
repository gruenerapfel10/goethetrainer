import { memo } from 'react';
import { CrossIcon } from './icons';
import { Button } from './ui/button';
import { useArtifactsContext } from '@/contexts/artifacts-context';

function PureArtifactCloseButton() {
  const { setArtifactsVisible } = useArtifactsContext();

  return (
    <Button
      variant="outline"
      className="h-fit p-2 hover:bg-button-outline-hover"
      onClick={() => {
        setArtifactsVisible(false);
      }}
    >
      <CrossIcon size={18} />
    </Button>
  );
}

export const ArtifactCloseButton = memo(PureArtifactCloseButton, () => true);
