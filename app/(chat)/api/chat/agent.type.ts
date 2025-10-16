import type { UIMessage } from "ai";
import type { LanguageModelV1 } from "@ai-sdk/provider";
import type { InferSelectModel } from "drizzle-orm";
import type { chat } from "@/lib/db/schema";
import type { Session } from "next-auth";


export type AgentMeta = {
    session: Session,
    userMessage: UIMessage,
    titleInputTokens: number,
    titleOutputTokens: number,
    chat: InferSelectModel<typeof chat>,
    model: LanguageModelV1
}