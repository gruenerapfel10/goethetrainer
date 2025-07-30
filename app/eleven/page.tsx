'use client';

import { useEffect, useState, useRef } from 'react';
import { useConversation } from '@elevenlabs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Volume2, Mic, MicOff, Loader2, Phone, PhoneOff } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Orb } from '@/components/ui/orb';
import { GradientBlobs } from '@/components/ui/gradient-blobs';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Initialize with API key globally for the ElevenLabs client
if (typeof window !== 'undefined') {
  const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
  if (apiKey) {
    window.localStorage.setItem('elevenlabs_api_key', apiKey);
  }
}

interface ToolParameters {
  word: string;
  definition: string;
  context: string;
}

interface GrammarToolParameters {
  grammarArea: string;
  incorrectSentence: string;
  correctedSentence: string;
  explanation: string;
}

interface LearningItem {
  timestamp: Date;
  type: 'vocabulary' | 'grammar';
}

interface VocabularyItem extends LearningItem {
  type: 'vocabulary';
  word: string;
  definition: string;
  context: string;
}

interface GrammarItem extends LearningItem {
  type: 'grammar';
  grammarArea: string;
  incorrectSentence: string;
  correctedSentence: string;
  explanation: string;
}

type LearningEntry = VocabularyItem | GrammarItem;

export default function DashboardPage() {
  const [volume, setVolume] = useState(0.5);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ text: string; sender: 'user' | 'ai' }>>([]);
  const [learningEntries, setLearningEntries] = useState<LearningEntry[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to AI');
      setError(null);
    },
    onDisconnect: () => {
      console.log('Disconnected from AI');
      setIsReady(false);
    },
    onMessage: (message) => {
      setMessages(prev => [...prev, { 
        text: message.message, 
        sender: message.source === 'user' ? 'user' : 'ai'
      }]);
    },
    onError: (error) => {
      console.error('Error:', error);
      setError('An error occurred during the conversation');
      setIsReady(false);
    },
    clientTools: {
      newGermanWord: async ({ word, definition, context }: ToolParameters) => {
        const newItem: VocabularyItem = {
          type: 'vocabulary',
          word,
          definition,
          context,
          timestamp: new Date()
        };
        setLearningEntries(prev => [...prev, newItem]);
        return `Added new word "${word}" to vocabulary`;
      },
      noteGrammarStruggle: async ({ grammarArea, incorrectSentence, correctedSentence, explanation }: GrammarToolParameters) => {
        const newItem: GrammarItem = {
          type: 'grammar',
          grammarArea,
          incorrectSentence,
          correctedSentence,
          explanation,
          timestamp: new Date()
        };
        setLearningEntries(prev => [...prev, newItem]);
        return `Added note about ${grammarArea} grammar usage`;
      }
    }
  });

  // Add scroll to bottom effect when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const startConversation = async () => {
    try {
      setError(null);
      
      // Check for required environment variables
      const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
      const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
      
      if (!agentId) {
        throw new Error('Missing NEXT_PUBLIC_ELEVENLABS_AGENT_ID environment variable');
      }
      
      if (!apiKey) {
        throw new Error('Missing NEXT_PUBLIC_ELEVENLABS_API_KEY environment variable');
      }

      // Request microphone access
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Start the session with proper initialization
      await conversation.startSession({
        agentId,
        // Set initial parameters based on ElevenLabs documentation
        overrides: {
          tts: {
            // Optional: Configure text-to-speech settings
            voiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID, // Optional custom voice
          },
          conversation: {
            // Optional: Configure conversation settings
            textOnly: false, // Enable voice conversation
          }
        }
      });
      
      setIsReady(true);
    } catch (error) {
      console.error('Error starting conversation:', error);
      setError(error instanceof Error ? error.message : 'Failed to start conversation');
      setIsReady(false);
    }
  };

  const handleVolumeChange = async (newVolume: number) => {
    setVolume(newVolume);
    await conversation.setVolume({ volume: newVolume });
  };

  const stopConversation = async () => {
    try {
      await conversation.endSession();
    } catch (error) {
      console.error('Error stopping conversation:', error);
    }
    setIsReady(false);
  };

  return (
    <div className="h-[calc(100vh-1px)] flex flex-col">
      <ResizablePanelGroup
        direction="horizontal"
        className="flex-1"
      >
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col relative">
            {/* Background Layer with Orb */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
              <GradientBlobs />
              <div className="w-[800px] h-[800px] relative flex items-center justify-center">
                <Orb 
                  isActive={isReady}
                  color1="#2792DC"
                  color2="#9CE6E6"
                />
              </div>
            </div>

            {/* Call Control Button - Floating above chat */}
            {!isReady && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <div className="pointer-events-auto">
                  <button
                    onClick={startConversation}
                    className={cn(
                      "h-12 px-6 rounded-full flex items-center gap-2 transition-all duration-200",
                      "backdrop-blur-[4px] shadow-lg border",
                      "bg-primary/90 text-primary-foreground border-primary/20 hover:bg-primary",
                      "hover:scale-105 hover:shadow-xl hover:shadow-blue-500/20"
                    )}
                  >
                    <Phone className="w-5 h-5" />
                    <span>Start Call</span>
                  </button>
                </div>
              </div>
            )}

            {/* Glassmorphic Chat Container */}
            <div className="relative flex-1 flex flex-col h-full p-4 z-10">
              <div className="flex-1 rounded-lg overflow-hidden backdrop-blur-[6px] bg-background/40 border border-border/50 shadow-lg flex flex-col">
                {/* Volume and Status Controls */}
                <div className="p-3 flex items-center justify-end gap-2 border-b bg-background/50 backdrop-blur-md">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-md">
                      <span>{conversation.status === 'connected' ? 'Connected' : 'Disconnected'}</span>
                      {conversation.isSpeaking && (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                      )}
                    </div>
                  </div>
                  {isReady && (
                    <Button
                      onClick={stopConversation}
                      variant="destructive"
                      size="sm"
                      className="gap-2"
                    >
                      <PhoneOff className="w-4 h-4" />
                      <span>End Call</span>
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <Volume2 className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[200px] p-3">
                      <Input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Chat Messages */}
                <div 
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto"
                >
                  <div className="flex flex-col gap-4 p-4 min-h-full">
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${
                          message.sender === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[70%] p-3 rounded-lg backdrop-blur-[4px] ${
                            message.sender === 'user'
                              ? 'bg-primary/80 text-primary-foreground'
                              : 'bg-secondary/80 text-secondary-foreground'
                          }`}
                        >
                          {message.text}
                        </div>
                      </div>
                    ))}
                    {conversation.isSpeaking && (
                      <div className="flex justify-start">
                        <Skeleton className="h-12 w-48" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg mt-4">
                  {error}
                </div>
              )}
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full p-4 overflow-hidden">
            <div className="h-full overflow-auto rounded-lg backdrop-blur-[6px] bg-background/40 border border-border/50 shadow-lg">
              <div className="p-4">
                <h2 className="text-xl font-semibold mb-4">Learning Progress</h2>
                {learningEntries.length === 0 ? (
                  <p className="text-muted-foreground">
                    No entries yet. Start a conversation and I'll help you learn!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {learningEntries.map((item, index) => (
                      <div key={index} className="border border-border/30 rounded-lg p-4 backdrop-blur-[4px] bg-background/20">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">
                            {item.type === 'vocabulary' ? item.word : item.grammarArea}
                          </h3>
                          <span className={`text-xs px-2 py-1 rounded-full backdrop-blur-[2px] ${
                            item.type === 'grammar' 
                              ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' 
                              : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          }`}>
                            {item.type}
                          </span>
                        </div>
                        
                        {item.type === 'vocabulary' ? (
                          <>
                            <p className="text-muted-foreground mt-1">{item.definition}</p>
                            <p className="text-sm mt-2 italic">"{item.context}"</p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm mt-2 line-through text-red-400">
                              {item.incorrectSentence}
                            </p>
                            <p className="text-sm mt-1 text-green-400">
                              {item.correctedSentence}
                            </p>
                            <p className="text-sm mt-2 text-muted-foreground">
                              <span className="font-medium">Why? </span>
                              {item.explanation}
                            </p>
                          </>
                        )}
                        
                        <p className="text-xs text-muted-foreground mt-2">
                          Added: {item.timestamp.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
} 