'use client';
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import KnowledgeBaseFileList from './knowledge-base-file-list';
import UserManagement from './user-management';
import SystemPromptsPage from './SystemPromptsPage';
import { useTranslations } from 'next-intl';
import ChatManagement from './ChatManagement/ChatManagement';

export default function AdminDashboard() {
  const router = useRouter();
  const t = useTranslations('chat');

  const handleBackToChat = () => {
    router.push('/');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-input bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="flex h-14 items-center px-2 sm:px-4">
          <div className="flex items-center gap-2 sm:gap-4 w-full">
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-accent"
              onClick={handleBackToChat}
              aria-label="Back to chat"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-base sm:text-lg font-semibold truncate">
              {t('adminPortal')}
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-[calc(100vh-3.5rem)]">
        {/* Tabs Navigation */}
        <Tabs defaultValue="files" className="flex flex-col flex-1">
          <div className="border-b border-input">
            <div className="px-2 sm:px-4 overflow-x-auto no-scrollbar">
              <TabsList className="bg-transparent border-0 p-0 h-auto w-max min-w-full">
                {[
                  { id: 'files', label: t('knowledgeBase') },
                  { id: 'users', label: t('userManagement') },
                  { id: 'chat-management', label: t('titleLogo') },
                  { id: 'system-prompts', label: t('systemPrompts') },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="data-[state=active]:bg-transparent data-[state=active]:text-foreground 
                               data-[state=active]:border-b-2 data-[state=active]:border-primary 
                               rounded-none px-3 py-3 text-sm whitespace-nowrap text-muted-foreground
                               flex-grow sm:flex-grow-0"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            <TabsContent
              value="files"
              className="m-0 p-2 sm:p-4 h-full overflow-y-auto"
            >
              <KnowledgeBaseFileList />
            </TabsContent>

            <TabsContent
              value="users"
              className="m-0 p-2 sm:p-4 h-full overflow-y-auto"
            >
              <UserManagement />
            </TabsContent>

            <TabsContent
              value="chat-management"
              className="m-0 p-2 sm:p-4 h-full overflow-y-auto"
            >
              <ChatManagement />
            </TabsContent>
            
            <TabsContent
              value="system-prompts"
              className="m-0 p-2 sm:p-4 h-full overflow-y-auto"
            >
              <SystemPromptsPage />
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
}