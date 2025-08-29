import type {ReasonTimelineProps } from "@/components/timeline/types";
import {useMemo} from "react";
import {processReasonStreamUpdates} from "@/components/timeline/utils";
import {GeneralTimeline} from "@/components/timeline/components/general-timeline";


export function ReasonTimeline({ steps, timelineId, streamUpdates }: ReasonTimelineProps) {
    // Process stream updates into timeline steps if steps are not provided
    const processedSteps = useMemo(() => steps || processReasonStreamUpdates(streamUpdates || []),
        [steps, streamUpdates]
    );

    return <GeneralTimeline timelineId={timelineId} steps={processedSteps}/>
}