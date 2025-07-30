import {Text2sqlStreamStateEnum, type Text2SqlStreamUpdate, type TimelineStep} from "../";
import {Database} from "lucide-react";
import React from "react";
import type { useTranslations } from "next-intl";


const getText2sqlTimelineStep = (
    streamUpdate: Text2SqlStreamUpdate,
    t: ReturnType<typeof useTranslations>
): TimelineStep => {
    const commonUpdate = {
        id: streamUpdate.id,
        timestamp: streamUpdate.timestamp,
        status: 'completed',
    };

    switch (streamUpdate.state) {
        case Text2sqlStreamStateEnum.SQL_GENERATION_START:
            return {
                ...commonUpdate,
                title: t('sqlGeneration'),
                icon: <Database className="h-6 w-6" />,
                message: streamUpdate.question,
                status: 'completed',
            };
        case Text2sqlStreamStateEnum.SQL_GENERATION_UNDERSTANDING:
            return {
                ...commonUpdate,
                title: t('understandingQuestion'),
                icon: <Database className="h-6 w-6" />,
                message: '',
                status: 'completed',
            };
        case Text2sqlStreamStateEnum.SQL_GENERATION_SEARCHING:
            return {
                ...commonUpdate,
                title: t('understandingQuestion'),
                icon: <Database className="h-6 w-6" />,
                message: t('rephrasedQuestion', {question: streamUpdate.rephrasedQuestion}),
                status: 'completed',
            };
        case Text2sqlStreamStateEnum.SQL_GENERATION_PLANNING:
            return {
                ...commonUpdate,
                title: t('sqlPlanning'),
                icon: <Database className="h-6 w-6" />,
                message: streamUpdate.intentReasoning,
                status: 'completed',
            };
        case Text2sqlStreamStateEnum.SQL_GENERATION_GENERATING:
            return {
                ...commonUpdate,
                title: t('reasoning'),
                icon: <Database className="h-6 w-6" />,
                message: streamUpdate.sqlGenerationReasoning,
                status: 'completed',
            };
        case Text2sqlStreamStateEnum.SQL_GENERATION_SUCCESS:
            return {
                ...commonUpdate,
                title: t('sqlSuccess'),
                message: streamUpdate.sql,
                icon: <Database className="h-6 w-6" />,
                status: 'completed',
            };
        case Text2sqlStreamStateEnum.SQL_GENERATION_FAILED:
            return {
                ...commonUpdate,
                title: t('sqlFailed'),
                message: streamUpdate.invalidSql,
                icon: <Database className="h-6 w-6" />,
                status: 'error',
            };
        case Text2sqlStreamStateEnum.ERROR:
            return {
                ...commonUpdate,
                title: t('error'),
                message: streamUpdate.error,
                icon: <Database className="h-6 w-6" />,
                status: 'error',
            };
        case Text2sqlStreamStateEnum.SQL_EXECUTION_START:
            return {
                ...commonUpdate,
                title: t('executionStart'),
                icon: <Database className="h-6 w-6" />,
                status: 'completed',
            };
        case Text2sqlStreamStateEnum.SQL_EXECUTION_END:
            return {
                ...commonUpdate,
                title: t('executionEnd'),
                icon: <Database className="h-6 w-6" />,
                status: 'completed',
            };
        case Text2sqlStreamStateEnum.SQL_EXECUTION_ERROR:
            return {
                ...commonUpdate,
                title: t('executionError'),
                message: streamUpdate.error || '',
                icon: <Database className="h-6 w-6" />,
                status: 'error',
            };
        case Text2sqlStreamStateEnum.RESPONSE:
            return {
                ...commonUpdate,
                title: t('reasoning'),
                message: streamUpdate.response,
                icon: <Database className="h-6 w-6" />,
                status: 'completed',
            };
        case Text2sqlStreamStateEnum.RESPONSE_STOP:
            return {
                ...commonUpdate,
                title: '',
                message: t('resultGenerated'),
                icon: null,
                small: true,
                type: 'unified',
                status: 'completed',
            };
        default:
            return {
                ...commonUpdate,
                title: streamUpdate.state,
                icon: <Database className="h-6 w-6" />,
                status: 'completed',
            };
    }
};

export function transformText2sqlStreamToTimeline(streamUpdates: Text2SqlStreamUpdate[], t: ReturnType<typeof useTranslations>): TimelineStep[] {
    const transformedUpdates: TimelineStep[] = []
    
    for (const streamUpdate of streamUpdates) {
        if (streamUpdate.state === Text2sqlStreamStateEnum.SQL_GENERATION_START) {
            const hasFinishedUpdate = streamUpdates.some((update) => update.state === Text2sqlStreamStateEnum.SQL_GENERATION_SUCCESS);
            const hasFailedUpdate = streamUpdates.some((update) => update.state === Text2sqlStreamStateEnum.SQL_GENERATION_FAILED);
            const childrenUpdateTypes = [
                Text2sqlStreamStateEnum.SQL_GENERATION_START,
                Text2sqlStreamStateEnum.SQL_GENERATION_SEARCHING,
                Text2sqlStreamStateEnum.SQL_GENERATION_PLANNING,
                Text2sqlStreamStateEnum.SQL_GENERATION_GENERATING,
                Text2sqlStreamStateEnum.SQL_GENERATION_SUCCESS,
                Text2sqlStreamStateEnum.SQL_GENERATION_FAILED,
                Text2sqlStreamStateEnum.ERROR,
            ];

            const currentUpdateToShow = streamUpdates.findLast((update) => childrenUpdateTypes.includes(update.state)) || streamUpdate;

            const baseUpdate = getText2sqlTimelineStep(currentUpdateToShow, t);
            const children = streamUpdates
                .filter((update) => childrenUpdateTypes.includes(update.state))
                .map((update) => getText2sqlTimelineStep(update, t));

            transformedUpdates.push({
                ...baseUpdate,
                children,
                status: hasFinishedUpdate ? 'completed' : hasFailedUpdate ? 'error' : 'running',
                timestamp: streamUpdate.timestamp,
            });
        }

        if (streamUpdate.state === Text2sqlStreamStateEnum.SQL_EXECUTION_START) {
            const finishedUpdate = streamUpdates
                .find((update: Text2SqlStreamUpdate) => update.state === Text2sqlStreamStateEnum.SQL_EXECUTION_END);
            const errorUpdate = streamUpdates
                .find((update: Text2SqlStreamUpdate) => update.state === Text2sqlStreamStateEnum.SQL_EXECUTION_ERROR);

            if (!finishedUpdate && !errorUpdate) {
                const baseUpdate = getText2sqlTimelineStep(streamUpdate, t);
                transformedUpdates.push({
                    ...baseUpdate,
                    status: 'running',
                })
            }
        }

        if (streamUpdate.state === Text2sqlStreamStateEnum.SQL_EXECUTION_END) {
            transformedUpdates.push(getText2sqlTimelineStep(streamUpdate, t));
        }
        if (streamUpdate.state === Text2sqlStreamStateEnum.SQL_EXECUTION_ERROR) {
            transformedUpdates.push(getText2sqlTimelineStep(streamUpdate, t));
        }
    }

    const fullResponseUpdate = streamUpdates.find((update) => update.state === Text2sqlStreamStateEnum.RESPONSE);
    const responseStopUpdate = streamUpdates.find((update) => update.state === Text2sqlStreamStateEnum.RESPONSE_STOP);

    const firstResponseDeltaUpdate = streamUpdates.find((update) => update.state === Text2sqlStreamStateEnum.RESPONSE_DELTA);
    if (firstResponseDeltaUpdate) {
        const fullResponse = streamUpdates
            .filter((update) => update.state === Text2sqlStreamStateEnum.RESPONSE_DELTA)
            .reduce((acc, update) => acc + update.responseChunk, '');

        const fullResponseUpdate = getText2sqlTimelineStep({
            response: fullResponse,
            id: 'response',
            state: Text2sqlStreamStateEnum.RESPONSE,
            timestamp: firstResponseDeltaUpdate.timestamp || Date.now(),
        }, t);
        transformedUpdates.push({ ...fullResponseUpdate, status: responseStopUpdate ? 'completed' : 'running' });
    }

    if (fullResponseUpdate) {
        transformedUpdates.push(getText2sqlTimelineStep(fullResponseUpdate, t));
    }

    if (responseStopUpdate) {
        transformedUpdates.push(getText2sqlTimelineStep(responseStopUpdate, t));
    }

    return transformedUpdates

}