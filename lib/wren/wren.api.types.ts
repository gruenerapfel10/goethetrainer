import type {ModelMDL, RelationMDL, ViewMDL} from "@/lib/wren/wren.types";

export type WrenAskRequest = {
    question: string;
    sampleSize?: number;
    language?: string;
    threadId?: string;
}


export type WrenAskSqlResponse = { sql: string; summary: string; threadId: string }
export type WrenAskNonSqlResponse = { type: 'NON_SQL_QUERY'; explanation: string; threadId: string }
export type WrenAskResponse = WrenAskSqlResponse | WrenAskNonSqlResponse


export type WrenGenerateSqlRequest = {
    question: string;
    threadId?: string;
    language?: string;
    returnSqlDialect?: boolean;
}

export type WrenGenerateSqlResponse = {
    sql: string;
    threadId: string;
}


export type WrenRunSqlRequest = {
    sql: string;
    threadId?: string;
    limit?: number;
}

export type WrenRunSqlResponse = {
    records: Record<string, any>[];
    columns: string[];
    threadId: string;
    totalRows: number;
}

export type WrenGenerateSummaryRequest = {
    question: string;
    sql: string;
    sampleSize?: number;
    language?: string;
    threadId?: string;
}

export type WrenGenerateSummaryResponse = {
    summary: string;
    threadId: string;
}

export type WrenFetchMetadataRequest = {}

export type WrenFetchMetadataResponse = {
    hash: string;
    models: ModelMDL[];
    relationships: RelationMDL[];
    views: ViewMDL[];
}

export enum WrenErrorCodes {
    INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
    NO_RELEVANT_DATA = 'NO_RELEVANT_DATA',
    NO_RELEVANT_SQL = 'NO_RELEVANT_SQL',
    RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
    MDL_PARSE_ERROR = 'MDL_PARSE_ERROR',
    NO_CHART = 'NO_CHART',

    // Exception error for AI service (e.g., network connection error)
    AI_SERVICE_UNDEFINED_ERROR = 'OTHERS',

    // IBIS Error
    IBIS_SERVER_ERROR = 'IBIS_SERVER_ERROR',

    // Connector errors
    CONNECTION_ERROR = 'CONNECTION_ERROR',
    INIT_SQL_ERROR = 'INIT_SQL_ERROR',
    SESSION_PROPS_ERROR = 'SESSION_PROPS_ERROR',
    // postgres
    CONNECTION_REFUSED = 'CONNECTION_REFUSED',

    // calculated field validation
    DUPLICATED_FIELD_NAME = 'DUPLICATED_FIELD_NAME',
    INVALID_EXPRESSION = 'INVALID_EXPRESSION',
    INVALID_CALCULATED_FIELD = 'INVALID_CALCULATED_FIELD',

    // when createing views
    INVALID_VIEW_CREATION = 'INVALID_VIEW_CREATION',

    // dry run error
    DRY_RUN_ERROR = 'DRY_RUN_ERROR',
    DRY_PLAN_ERROR = 'DRY_PLAN_ERROR',

    // deploy sql pair error
    DEPLOY_SQL_PAIR_ERROR = 'DEPLOY_SQL_PAIR_ERROR',
    GENERATE_QUESTIONS_ERROR = 'GENERATE_QUESTIONS_ERROR',
    INVALID_SQL_ERROR = 'INVALID_SQL_ERROR',

    // wren engine error
    WREN_ENGINE_ERROR = 'WREN_ENGINE_ERROR',

    // asking task error
    // when rerun from cancelled, the task is identified as general or misleading query
    IDENTIED_AS_GENERAL = 'IDENTIED_AS_GENERAL',
    IDENTIED_AS_MISLEADING_QUERY = 'IDENTIED_AS_MISLEADING_QUERY',
    DEPLOY_TIMEOUT_ERROR = 'DEPLOY_TIMEOUT_ERROR',

    // api error
    NON_SQL_QUERY = 'NON_SQL_QUERY',
    NO_DEPLOYMENT_FOUND = 'NO_DEPLOYMENT_FOUND',

    // vega schema error
    FAILED_TO_GENERATE_VEGA_SCHEMA = 'FAILED_TO_GENERATE_VEGA_SCHEMA',
    POLLING_TIMEOUT = 'POLLING_TIMEOUT',

    // sql execution error
    SQL_EXECUTION_ERROR = 'SQL_EXECUTION_ERROR',
}
