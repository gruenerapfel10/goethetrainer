export enum WrenStreamEventTypeEnum {
    MESSAGE_START = 'message_start',
    MESSAGE_STOP = 'message_stop',
    STATE = 'state',
    CONTENT_BLOCK_START = 'content_block_start',
    CONTENT_BLOCK_DELTA = 'content_block_delta',
    CONTENT_BLOCK_STOP = 'content_block_stop',
    ERROR = 'error',
}

export enum WrenStreamStateEnum {
    SQL_GENERATION_START = 'sql_generation_start',
    SQL_GENERATION_UNDERSTANDING = 'sql_generation_understanding',
    SQL_GENERATION_SEARCHING = 'sql_generation_searching',
    SQL_GENERATION_PLANNING = 'sql_generation_planning',
    SQL_GENERATION_GENERATING = 'sql_generation_generating',
    SQL_GENERATION_CORRECTING = 'sql_generation_correcting',
    SQL_GENERATION_FINISHED = 'sql_generation_finished',
    SQL_GENERATION_FAILED = 'sql_generation_failed',
    SQL_GENERATION_STOPPED = 'sql_generation_stopped',
    SQL_GENERATION_SUCCESS = 'sql_generation_success',
    SQL_EXECUTION_START = 'sql_execution_start',
    SQL_EXECUTION_END = 'sql_execution_end',
    SQL_EXECUTION_ERROR = 'sql_execution_error',
    ERROR = 'error',
    RESPONSE = 'response',
    RESPONSE_DELTA = 'response_delta',
    RESPONSE_STOP = 'response_stop',
}

export enum ContentBlockContentType {
    SUMMARY_GENERATION = 'summary_generation',
    EXPLANATION = 'explanation',
}

// Interfaces for request and events
export interface AsyncAskRequest {
    question: string;
    sampleSize?: number;
    language?: string;
    threadId?: string;
}

export interface BaseEvent {
    timestamp: number;
}

export interface MessageStartEvent extends BaseEvent {
    type: WrenStreamEventTypeEnum.MESSAGE_START;
}

export interface MessageStopEvent extends BaseEvent {
    type: WrenStreamEventTypeEnum.MESSAGE_STOP;
    data: {
        threadId: string;
        duration: number;
    };
}

export interface StateEvent extends BaseEvent {
    type: WrenStreamEventTypeEnum.STATE;
    data: {
        state: WrenStreamStateEnum;
        id: string;
        timestamp: number;
        [key: string]: any;
    };
}

export interface ContentBlockStartEvent extends BaseEvent {
    type: WrenStreamEventTypeEnum.CONTENT_BLOCK_START;
    content_block: {
        type: 'text';
        name: ContentBlockContentType;
    };
}

export interface ContentBlockDeltaEvent extends BaseEvent {
    type: WrenStreamEventTypeEnum.CONTENT_BLOCK_DELTA;
    delta: {
        type: 'text_delta';
        text: string;
    };
}

export interface ContentBlockStopEvent extends BaseEvent {
    type: WrenStreamEventTypeEnum.CONTENT_BLOCK_STOP;
}

export interface ErrorEvent extends BaseEvent {
    type: WrenStreamEventTypeEnum.ERROR;
    data: {
        error: string;
        code?: string;
    };
}

export type StreamEvent =
    | MessageStartEvent
    | MessageStopEvent
    | StateEvent
    | ContentBlockStartEvent
    | ContentBlockDeltaEvent
    | ContentBlockStopEvent
    | ErrorEvent;


export interface StreamOptions extends AsyncAskRequest {
    onMessageStart?: () => void;
    onMessageStop?: (threadId: string, duration: number) => void;
    onStateUpdate?: (data: StateEvent['data']) => void;
    onContentBlockStart?: (block: ContentBlockContentType) => void;
    onContentBlockDelta?: (text: string) => void;
    onContentBlockStop?: () => void;
    onError?: (data: StateEvent['data']) => void;
    onComplete?: () => void;
}