import { SessionPageProvider } from '@/lib/sessions/session-page-context';
import { SessionTypeEnum } from '@/lib/sessions/session-registry';
import { SessionOrchestrator } from '@/components/session/session-orchestrator';

export default function WritingSessionPage() {
  return (
    <SessionPageProvider sessionType={SessionTypeEnum.WRITING}>
      <SessionOrchestrator />
    </SessionPageProvider>
  );
}