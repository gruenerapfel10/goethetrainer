import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Send, Bot, Loader2 } from 'lucide-react';
import { processAIRequest } from '@/lib/ai-service';
import { useCanvasContext } from './canvas-context';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  action?: string;
  reasoning?: string;
}

interface AIAssistantPanelProps {
  onClose?: () => void;
}

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { updateNodeData, addNode, deleteNode } = useCanvasContext();

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await processAIRequest(input);
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.reasoning,
        action: response.action,
        reasoning: response.reasoning,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Handle the AI's action
      if (response.action !== 'none' && response.parameters) {
        switch (response.action) {
          case 'create_node':
            addNode(response.parameters);
            break;
          case 'update_node':
            updateNodeData(response.parameters.id, response.parameters.updates);
            break;
          case 'delete_node':
            deleteNode(response.parameters.id);
            break;
          // Add other action handlers as needed
        }
      }
    } catch (error) {
      console.error('Error processing request:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request.',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              AI Assistant
            </h3>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex flex-col ${
              message.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`rounded-lg px-4 py-2 max-w-[80%] ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
              }`}
            >
              <p className="text-sm">{message.content}</p>
              {message.action && message.action !== 'none' && (
                <div className="mt-2 text-xs opacity-75">
                  Action: {message.action}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <style jsx>{`
        .message-bubble {
          word-wrap: break-word;
          max-width: 80%;
        }
      `}</style>
    </div>
  );
}; 