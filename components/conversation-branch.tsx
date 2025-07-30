'use client';

import { useState, useEffect } from 'react';
import { GitBranch, Copy, Trash2, ChevronRight, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { generateUUID } from '@/lib/utils';
import type { UIMessage } from 'ai';
import { cn } from '@/lib/utils';

interface Branch {
  id: string;
  name: string;
  parentId: string | null;
  messageCount: number;
  createdAt: Date;
  lastMessageAt: Date;
}

interface ConversationBranchProps {
  currentChatId: string;
  messages: UIMessage[];
  className?: string;
}

export function ConversationBranch({ 
  currentChatId, 
  messages,
  className 
}: ConversationBranchProps) {
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [showBranchSelector, setShowBranchSelector] = useState(false);

  // Load branches from localStorage
  useEffect(() => {
    const storedBranches = localStorage.getItem(`branches-${currentChatId}`);
    if (storedBranches) {
      const parsed = JSON.parse(storedBranches);
      setBranches(parsed.map((b: any) => ({
        ...b,
        createdAt: new Date(b.createdAt),
        lastMessageAt: new Date(b.lastMessageAt)
      })));
    } else {
      // Create main branch if none exists
      const mainBranch: Branch = {
        id: currentChatId,
        name: 'Main',
        parentId: null,
        messageCount: messages.length,
        createdAt: new Date(),
        lastMessageAt: new Date()
      };
      setBranches([mainBranch]);
      setCurrentBranch(mainBranch);
      saveBranches([mainBranch]);
    }
  }, [currentChatId, messages.length]);

  // Update current branch
  useEffect(() => {
    const current = branches.find(b => b.id === currentChatId);
    if (current) {
      setCurrentBranch(current);
    }
  }, [branches, currentChatId]);

  const saveBranches = (branchList: Branch[]) => {
    localStorage.setItem(`branches-${currentChatId}`, JSON.stringify(branchList));
  };

  const createBranch = (fromMessageIndex?: number) => {
    const branchId = generateUUID();
    const branchMessages = fromMessageIndex !== undefined 
      ? messages.slice(0, fromMessageIndex + 1)
      : [...messages];
    
    const newBranch: Branch = {
      id: branchId,
      name: `Branch ${branches.length}`,
      parentId: currentBranch?.id || currentChatId,
      messageCount: branchMessages.length,
      createdAt: new Date(),
      lastMessageAt: new Date()
    };

    const updatedBranches = [...branches, newBranch];
    setBranches(updatedBranches);
    saveBranches(updatedBranches);

    // Save branch messages
    localStorage.setItem(`messages-${branchId}`, JSON.stringify(branchMessages));

    // Navigate to new branch
    router.push(`/chat/${branchId}`);
  };

  const deleteBranch = (branchId: string) => {
    if (branchId === currentChatId || branches.length <= 1) return;
    
    const updatedBranches = branches.filter(b => b.id !== branchId);
    setBranches(updatedBranches);
    saveBranches(updatedBranches);
    
    // Remove branch messages
    localStorage.removeItem(`messages-${branchId}`);
    
    // If deleting current branch, go to main
    if (currentBranch?.id === branchId) {
      router.push(`/chat/${currentChatId}`);
    }
  };

  const switchBranch = (branchId: string) => {
    // If switching to a branch, load its messages
    if (branchId !== currentChatId) {
      const branchMessages = localStorage.getItem(`messages-${branchId}`);
      if (branchMessages) {
        // Store the branch messages temporarily so the chat can load them
        sessionStorage.setItem('branch-messages', branchMessages);
        sessionStorage.setItem('branch-id', branchId);
      }
    }
    router.push(`/chat/${branchId}`);
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <DropdownMenu open={showBranchSelector} onOpenChange={setShowBranchSelector}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
          >
            <GitBranch className="h-4 w-4" />
            <span className="text-sm">{currentBranch?.name || 'Main'}</span>
            <ChevronRight className="h-3 w-3 rotate-90" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <div className="p-2">
            <h4 className="text-sm font-medium mb-2">Conversation Branches</h4>
            {branches.map((branch) => (
              <div
                key={branch.id}
                className={cn(
                  'flex items-center justify-between p-2 rounded-md hover:bg-accent group',
                  branch.id === currentBranch?.id && 'bg-accent'
                )}
              >
                <button
                  onClick={() => switchBranch(branch.id)}
                  className="flex items-center gap-2 flex-1 text-left"
                >
                  <GitBranch className="h-3 w-3 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{branch.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {branch.messageCount} messages
                    </p>
                  </div>
                </button>
                {branch.id !== currentChatId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteBranch(branch.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => {
                setShowBranchSelector(false);
                createBranch();
              }}
            >
              <Copy className="h-3 w-3" />
              Create new branch
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Quick branch from current point */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => createBranch()}
        title="Branch from here"
        className="h-8 w-8"
      >
        <GitBranch className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Message-level branching component
export function MessageBranchButton({ 
  messageIndex,
  onBranch
}: {
  messageIndex: number;
  onBranch: (index: number) => void;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
      onClick={() => onBranch(messageIndex)}
      title="Branch conversation from here"
    >
      <GitBranch className="h-3 w-3" />
    </Button>
  );
}