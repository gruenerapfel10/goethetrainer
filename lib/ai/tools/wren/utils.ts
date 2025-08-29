import {type StateEvent, WrenStreamStateEnum} from "@/lib/wren/stream-api/wren.stream-api.types";

// Utility function to count tokens based on a rough estimate of 1 token ~ 4 characters
const countTokens = (text?: string) => {
    return typeof text === 'string' ? Math.ceil(text.length / 4) : 0;
}

const DB_DEFINITIONS_TOKENS_USAGE = 20000; // A large constant to account for the DB definitions and metadata
const GENERATED_SQL_TOKENS_USAGE = 200; //average number of tokens for generated SQL


export function calculateApproximateTokenUsageByWren(stateUpdates: StateEvent['data'][], dbMetadata: string): { inputTokens: number, outputTokens: number } {
    const tokenUsage: { inputTokens: number, outputTokens: number }[] = stateUpdates.map((update) => {
        switch (update.state) {
            case WrenStreamStateEnum.SQL_GENERATION_START:
                return {
                    inputTokens: countTokens(update.question) + countTokens(dbMetadata),
                    outputTokens: 0
                };
            case WrenStreamStateEnum.SQL_GENERATION_PLANNING:
                return {
                    inputTokens: countTokens(dbMetadata),
                    outputTokens: countTokens(update.rephrasedQuestion) + countTokens(update.intentReasoning)
                };
            case WrenStreamStateEnum.SQL_GENERATION_GENERATING:
                return {
                    inputTokens: countTokens(update.rephrasedQuestion) + countTokens(update.intentReasoning) + countTokens(dbMetadata) + DB_DEFINITIONS_TOKENS_USAGE, // Adding a large constant to account for the SQL generation reasoning
                    outputTokens: countTokens(update.sqlGenerationReasoning)
                }
            case WrenStreamStateEnum.SQL_GENERATION_SUCCESS:
                return {
                    inputTokens: countTokens(update.sqlGenerationReasoning) + countTokens(dbMetadata) + countTokens(update.rephrasedQuestion),
                    outputTokens: countTokens(update.sql)
                };
            case WrenStreamStateEnum.SQL_GENERATION_CORRECTING:
                return {
                    inputTokens: countTokens(update.sqlGenerationReasoning) + countTokens(dbMetadata) + countTokens(update.rephrasedQuestion),
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