import { SessionPageProvider } from '@/lib/sessions/session-page-context';
import { SessionTypeEnum } from '@/lib/sessions/session-registry';
import SessionPage from '@/components/session/session-page';

export default function ReadingPage() {
  return (
    <SessionPageProvider sessionType={SessionTypeEnum.READING}>
      <SessionPage />
    </SessionPageProvider>
  );
}