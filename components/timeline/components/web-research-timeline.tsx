import React, { useMemo } from "react";
import { GeneralTimeline } from "./general-timeline";
import { ResearchCompleteCard } from "./research-complete-card";
import { transformWebResearchToTimeline } from "../transformers/web-research-transformer";

interface WebResearchTimelineProps {
  updates: any[];
  timelineId?: string;
}

export function WebResearchTimeline({ updates, timelineId }: WebResearchTimelineProps) {
  const timelineSteps = useMemo(() => 
    transformWebResearchToTimeline(updates), 
    [updates]
  );

  // Check if research is complete
  const isComplete = useMemo(() => {
    return updates.some(u => 
      (u.id === 'final-synthesis' && u.status === 'completed') ||
      (u.type === 'progress' && u.isComplete === true)
    );
  }, [updates]);

  return (
    <div className="space-y-4">
      <GeneralTimeline timelineId={timelineId} steps={timelineSteps} />
      {isComplete && <ResearchCompleteCard updates={updates} />}
    </div>
  );
}