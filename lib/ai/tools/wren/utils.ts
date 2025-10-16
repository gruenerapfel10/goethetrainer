import {type StateEvent, WrenStreamStateEnum} from "@/lib/wren/stream-api/wren.stream-api.types";

// Utility function to count tokens based on a rough estimate of 1 token ~ 4 characters
const countTokens = (text?: string) => {
    return typeof text === 'string' ? Math.ceil(text.length / 4) : 0;
}

const DB_DEFINITIONS_TOKENS_USAGE = 20000; // A large constant to account for the DB definitions
const DB_METADATA_TOKENS_USAGE = 10000; // An approximate constant to account for DB metadata (after retrieval of top 10 tables)
const GENERATED_SQL_TOKENS_USAGE = 200; //average number of tokens for generated SQL


export function calculateApproximateTokenUsageByWren(stateUpdates: StateEvent['data'][]): { inputTokens: number, outputTokens: number } {
    const tokenUsage: { inputTokens: number, outputTokens: number }[] = stateUpdates.map((update) => {
        switch (update.state) {
            case WrenStreamStateEnum.SQL_GENERATION_START:
                return {
                    inputTokens: countTokens(update.question) + DB_METADATA_TOKENS_USAGE,
                    outputTokens: 0
                };
            case WrenStreamStateEnum.SQL_GENERATION_PLANNING:
                return {
                    inputTokens: DB_METADATA_TOKENS_USAGE,
                    outputTokens: countTokens(update.rephrasedQuestion) + countTokens(update.intentReasoning)
                };
            case WrenStreamStateEnum.SQL_GENERATION_GENERATING:
                return {
                    inputTokens: countTokens(update.rephrasedQuestion) + countTokens(update.intentReasoning) + DB_METADATA_TOKENS_USAGE + DB_DEFINITIONS_TOKENS_USAGE, // Adding a large constant to account for the SQL generation reasoning
                    outputTokens: countTokens(update.sqlGenerationReasoning)
                }
            case WrenStreamStateEnum.SQL_GENERATION_SUCCESS:
                return {
                    inputTokens: countTokens(update.sqlGenerationReasoning) + DB_METADATA_TOKENS_USAGE + countTokens(update.rephrasedQuestion),
                    outputTokens: countTokens(update.sql)
                };
            case WrenStreamStateEnum.SQL_GENERATION_CORRECTING:
                return {
                    inputTokens: countTokens(update.sqlGenerationReasoning) + DB_METADATA_TOKENS_USAGE + countTokens(update.rephrasedQuestion),
                    outputTokens: GENERATED_SQL_TOKENS_USAGE,
                };
            case WrenStreamStateEnum.RESPONSE:
                return { inputTokens: 0, outputTokens: countTokens(update.response) }
            default:
                return { inputTokens: 0, outputTokens: 0 }
        }
    })

        return tokenUsage.reduce((memo, current) => {
            return { inputTokens: memo.inputTokens + current.inputTokens, outputTokens: memo.outputTokens + current.outputTokens };
        }, { inputTokens: 0, outputTokens: 0 });

}