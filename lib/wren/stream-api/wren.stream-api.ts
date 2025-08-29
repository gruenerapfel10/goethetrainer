import axios, { type AxiosInstance } from 'axios';
import {
    WrenStreamEventTypeEnum,
    type StreamEvent,
    type MessageStopEvent,
    type StateEvent,
    type ContentBlockStartEvent,
    type ContentBlockDeltaEvent,
    type ErrorEvent,
    type StreamOptions, WrenStreamStateEnum,
} from './wren.stream-api.types';
import {generateUUID} from "@/lib/utils";


const wren: AxiosInstance = axios.create({
    baseURL: process.env.WREN_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    responseType: 'stream',
})


const generateUpdateId = () => `wren-update-${generateUUID()}`;


// Generic SSE stream handler
async function streamEndpoint(
    path: string,
    opts: StreamOptions
) {
    const {
        question,
        sampleSize,
        language,
        threadId,
        onMessageStart,
        onMessageStop,
        onStateUpdate,
        onContentBlockStart,
        onContentBlockDelta,
        onContentBlockStop,
        onError,
        onComplete,
    } = opts;

    const response = await wren.post(path, { question, sampleSize, language, threadId });
    const stream = response.data as NodeJS.ReadableStream;
    let buffer = '';

    // Dispatch event based on discriminated union type
    function dispatch(event: StreamEvent) {
        switch (event.type) {
            case WrenStreamEventTypeEnum.MESSAGE_START:
                onMessageStart?.();
                break;
            case WrenStreamEventTypeEnum.MESSAGE_STOP: {
                const e = event as MessageStopEvent;
                onMessageStop?.(e.data.threadId, e.data.duration);
                break;
            }
            case WrenStreamEventTypeEnum.STATE: {
                const e = event as StateEvent;
                const data = {
                    ...e.data,
                    id: generateUpdateId(),
                    timestamp: Date.now(),
                }
                onStateUpdate?.(data);
                break;
            }
            case WrenStreamEventTypeEnum.CONTENT_BLOCK_START: {
                const e = event as ContentBlockStartEvent;
                onContentBlockStart?.(e.content_block.name);
                break;
            }
            case WrenStreamEventTypeEnum.CONTENT_BLOCK_DELTA: {
                const e = event as ContentBlockDeltaEvent;
                onContentBlockDelta?.(e.delta.text);
                break;
            }
            case WrenStreamEventTypeEnum.CONTENT_BLOCK_STOP:
                onContentBlockStop?.();
                break;
            case WrenStreamEventTypeEnum.ERROR: {
                const e = event as ErrorEvent;
                const data = {
                    ...e.data,
                    id: generateUpdateId(),
                    timestamp: Date.now(),
                    state: WrenStreamStateEnum.ERROR,
                }
                onError?.(data);
                break;
            }
        }
    }

    // Parse SSE chunks
    function processBuffer() {
        let idx: number;
        while ((idx = buffer.indexOf('\n\n')) > -1) {
            const chunk = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            for (const line of chunk.split('\n')) {
                if (line.startsWith('data:')) {
                    try {
                        const payload = JSON.parse(line.replace(/^data:\s*/, '')) as StreamEvent;
                        dispatch(payload);
                    } catch {
                        console.warn('Failed to parse SSE payload:', line);
                    }
                }
            }
        }
    }

    stream.on('data', (chunk: Buffer) => {
        buffer += chunk.toString('utf-8');
        processBuffer();
    });

    stream.on('end', () => {
        onComplete?.();
    });

    // stream.on('error', (err: Error) => {
    //     onError?.(err.message);
    // });

    return {
        cancel: () => {
            // if (typeof stream.destroy === 'function') {
            //     stream.destroy();
            // }
        },
    };
}


export function streamAsk(opts: StreamOptions) {
    return streamEndpoint('/stream/ask', opts);
}

export function streamGenerateSql(opts: StreamOptions) {
    return streamEndpoint('/stream/generate_sql', opts);
}