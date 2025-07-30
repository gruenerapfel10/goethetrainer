import {
    GeneralTimeline,
    type Text2sqlTimelineProps,
} from "@/components/timeline";
import React, {useMemo} from "react";
import {transformText2sqlStreamToTimeline} from "@/components/timeline/transformers/text2sql-transformer";
import {useTranslations} from "next-intl";



export function Text2sqlTimeline({ timelineId, streamUpdates }: Text2sqlTimelineProps) {
    const t = useTranslations('chat.text2sqlTimeline')
    const timelineSteps = useMemo(() => transformText2sqlStreamToTimeline(streamUpdates, t), [streamUpdates, t])
    return <GeneralTimeline timelineId={timelineId} steps={timelineSteps} />
}