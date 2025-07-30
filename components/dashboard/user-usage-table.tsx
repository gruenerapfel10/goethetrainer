import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { UserUsage } from '@/types/dashboard';
import { useTranslations } from 'next-intl';

interface UserUsageTableProps {
  users: UserUsage[];
}

export function UserUsageTable({ users }: UserUsageTableProps) {
  const t = useTranslations('dashboard.tables.userUsage.columns');

  if (!users || users.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        No user data available
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border">
            <TableHead className="text-xs font-medium text-muted-foreground p-3">{t('user')}</TableHead>
            <TableHead className="text-right text-xs font-medium text-muted-foreground p-3">{t('messages')}</TableHead>
            <TableHead className="text-right text-xs font-medium text-muted-foreground p-3">{t('lastActive')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.email} className="border-b border-border hover:bg-muted/20">
              <TableCell className="font-medium text-sm p-3">{user.email}</TableCell>
              <TableCell className="text-right text-sm p-3">{user.messageCount}</TableCell>
              <TableCell className="text-right text-sm p-3">
                {new Date(user.lastActive).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}