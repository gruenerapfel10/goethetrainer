import { SessionPageProvider } from '@/lib/sessions/session-page-context';
import { SessionTypeEnum } from '@/lib/sessions/session-registry';
import { SessionOrchestrator } from '@/components/session/session-orchestrator';

export default function ReadingSessionPage() {
  return (
    <SessionPageProvider sessionType={SessionTypeEnum.READING}>
      <SessionOrchestrator />
    </SessionPageProvider>
  );
}