import type { LanguageModelV1, UIMessage } from "ai";
import type { InferSelectModel } from "drizzle-orm";
import type { chat } from "@/lib/db/schema";
import type { Session } from "@/types/next-auth";


export type AgentMeta = {
    session: Session,
    userMessage: UIMessage,
    titleInputTokens: number,
    titleOutputTokens: number,
    chat: InferSelectModel<typeof chat> | null,
    model: LanguageModelV1
}