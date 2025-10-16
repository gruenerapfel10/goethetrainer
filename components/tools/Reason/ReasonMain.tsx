'use client';

import React, { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { TimelineStep } from '@/components/timeline/components/timeline-step';
import { ToolHandler } from '@/components/tools/ToolHandler';

interface ReasonProps {
  toolCallId: string;
  input?: {
    query?: string;
    agentType?: string;
    deepSearch?: boolean;
  };
  output?: any;
  state: string;
  message?: any;
  updates?: any[];
}

const ReasonMain: React.FC<ReasonProps> = ({
  toolCallId,
  input,
  output,
  state,
  message,
  updates
}) => {
  // Define icon parameters for different step types
  const textIconParams = {
    src: null,
    alt: "Text Analysis",
    width: 4,
    height: 4,
    className: "h-4 w-4"
  };

  const toolIconParams = {
    src: null,
    alt: "Tool Execution",
    width: 6,
    height: 6,
    className: "h-6 w-6"
  };

  const filteredUpdates = useMemo(() => {
    if (!updates || updates.length === 0) {
      return [];
    }
    return updates.filter(update => update != null);
  }, [updates]);

  return (
    <div className="space-y-4 mx-auto w-full">
      {filteredUpdates.length > 0 ? (
        <div>
          {filteredUpdates.map((update: any, index) => {
            const dataType = update.data?.type;
            const updateMessage = update.message || update.data?.message || update.text;
            const isToolStep = dataType === 'tool-result' || dataType === 'tool-call';
            const isTextStep = dataType === 'text-delta' || (!dataType && updateMessage);

            if (isTextStep) {
              return (
                <TimelineStep
                  key={`reasoning-step-${index}`}
                  id={`reasoning-step-${index}`}
                  title={dataType === 'text-delta' ? 'Reasoning' : 'Analysis'}
                  description={updateMessage || 'Thinking...'}
                  status="completed"
                  timestamp={update.timestamp || Date.now()}
                  iconParams={textIconParams}
                  data={update.data}
                  small={true}
                  type="unified"
                />
              );
            } else if (isToolStep) {
              const toolName = update.data?.details?.toolName || 'unknown';
              const isToolCall = dataType === 'tool-call';
              
              return (
                <ToolHandler
                  key={`reasoning-step-${index}`}
                  toolName={toolName}
                  toolCallId={`${toolCallId}-${index}`}
                  state={isToolCall ? 'input-available' : 'output-available'}
                  input={update.data?.details?.args}
                  output={update.data?.details?.result}
                  message={message}
                />
              );
            } else {
              // Unknown/error steps
              return (
                <TimelineStep
                  key={`reasoning-step-${index}`}
                  id={`reasoning-step-${index}`}
                  title="Unknown Step"
                  description={`Status: ${update.status || 'Unknown'}`}
                  status="error"
                  timestamp={update.timestamp || Date.now()}
                  iconParams={textIconParams}
                  data={update.data}
                />
              );
            }
          })}
        </div>
      ) : (
        <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 size={16} className="text-blue-600 animate-spin" />
            <span className="font-medium text-blue-800">Reasoning...</span>
          </div>
          <div className="text-sm text-gray-700">
            <p><strong>Query:</strong> {input?.query || 'Processing...'}</p>
            {input?.agentType && <p><strong>Agent:</strong> {input.agentType}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export { ReasonMain };
export default ReasonMain;