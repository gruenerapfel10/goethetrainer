'use client';

import type { User } from 'next-auth';
import { useRouter } from 'next/navigation';
import { SidebarHistory } from '@/components/sidebar-history';
import { SidebarUserNav } from '@/components/sidebar-user-nav';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';

import { LogoComponent } from './logo-component'; // Import the new component

export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const t = useTranslations();

  const { setOpenMobile } = useSidebar();
  const { theme } = useTheme();

  return (
    <Sidebar>
      <SidebarHeader className="pb-2">
        <SidebarMenu>
          <div className="flex flex-row justify-center items-center">
            <Link
              href="/"
              onClick={() => {
                setOpenMobile(false);
              }}
              className="flex flex-row gap-3 items-center"
            >
              <div
                className="h-8 px-2 relative "
                style={{
                  width: '140px',
                  height: '30px',
                }}
              >
                <LogoComponent />
              </div>
            </Link>
          </div>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarHistory user={user} />
      </SidebarContent>
      <SidebarFooter>{user && <SidebarUserNav user={user} />}</SidebarFooter>
    </Sidebar>
  );
}
