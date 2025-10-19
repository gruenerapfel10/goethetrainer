import { SessionPageProvider } from '@/lib/sessions/session-page-context';
import { SessionTypeEnum } from '@/lib/sessions/session-registry';
import { SessionOrchestrator } from '@/components/session/session-orchestrator';

export default function ListeningSessionPage() {
  return (
    <SessionPageProvider sessionType={SessionTypeEnum.LISTENING}>
      <SessionOrchestrator />
    </SessionPageProvider>
  );
}