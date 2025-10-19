import { SessionPageProvider } from '@/lib/sessions/session-page-context';
import { SessionTypeEnum } from '@/lib/sessions/session-registry';
import { SessionOrchestrator } from '@/components/session/session-orchestrator';

export default function SpeakingSessionPage() {
  return (
    <SessionPageProvider sessionType={SessionTypeEnum.SPEAKING}>
      <SessionOrchestrator />
    </SessionPageProvider>
  );
}