import { SessionPageProvider } from '@/lib/sessions/session-page-context';
import { SessionTypeEnum } from '@/lib/sessions/session-registry';
import SessionPage from '@/components/session/session-page';

export default function ListeningPage() {
  return (
    <SessionPageProvider sessionType={SessionTypeEnum.LISTENING}>
      <SessionPage />
    </SessionPageProvider>
  );
}