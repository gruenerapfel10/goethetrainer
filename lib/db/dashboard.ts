import { cache } from 'react';
import {
  count,
  eq,
  gte,
  sql,
  desc,
  and,
  countDistinct,
  lte,
} from 'drizzle-orm';
import { chat, message, user, vote, useCase, } from './schema';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import type {
  DashboardStats,
  UserUsage,
  FlaggedMessage,
} from '../../types/dashboard';
import {
  generateTopUseCases,
  type GenerationProgress,
  type GenerationSummary,
} from '../use-case-generation';

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export const getDashboardStats = cache(async (): Promise<DashboardStats> => {
  try {
    // Get total message count
    const [messageCount] = await db.select({ count: count() }).from(message);
    const [userCount] = await db.select({ count: count() }).from(user);

    // Count messages that have at least one negative vote
    const [{ count: negativeMessages }] = await db
      .select({ count: countDistinct(vote.messageId) })
      .from(vote)
      .where(eq(vote.isUpvoted, false));

    // Count total votes
    const [{ count: totalVotes }] = await db
      .select({ count: count() })
      .from(vote);

    // Get weekly message counts for the past 4 weeks
    const today = new Date();
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(today.getDate() - 28); // Go back 4 weeks

    const weeklyMessages = await db
      .select({
        weekStart: sql`date_trunc('week', "createdAt"::timestamp)`,
        count: count(),
      })
      .from(message)
      .where(
        and(
          gte(message.createdAt, fourWeeksAgo),
          lte(message.createdAt, today),
        ),
      )
      .groupBy(sql`date_trunc('week', "createdAt"::timestamp)`)
      .orderBy(sql`date_trunc('week', "createdAt"::timestamp)`);

    const totalMessages = messageCount.count;

    const positivePercentage =
      totalMessages > 0
        ? Number.parseFloat(
            (
              ((totalMessages - negativeMessages) / totalMessages) *
              100
            ).toFixed(2),
          )
        : 0;

    return {
      totalMessages,
      totalUsers: userCount.count,
      positivePercentage,
      totalVotes,
      weeklyMessages,
    };
  } catch (error) {
    console.error('Failed to get dashboard stats:', error);
    throw error;
  }
});

export const getUserUsageOverview = cache(async (): Promise<UserUsage[]> => {
  try {
    // Calculate date 7 days ago from current date
    const endDate = new Date(); // Current date (today)
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7); // 7 days ago

    const userStats = await db
      .select({
        id: user.id,
        email: user.email,
        messageCount: count(message.id),
        chatCount: countDistinct(chat.id),
        lastActive: sql<string>`MAX(${message.createdAt}::text)`,
      })
      .from(message)
      .leftJoin(chat, eq(message.chatId, chat.id))
      .leftJoin(user, eq(chat.userId, user.id))
      .where(
        and(gte(message.createdAt, startDate), lte(message.createdAt, endDate)),
      )
      .groupBy(user.id, user.email)
      .orderBy(sql`count(${message.id}) DESC`);

    return userStats as UserUsage[];
  } catch (error) {
    console.error('Failed to get user usage overview:', error);
    throw error;
  }
});

export const getFlaggedMessages = cache(async (): Promise<FlaggedMessage[]> => {
  try {
    const flaggedMessages = await db
      .select({
        messageId: message.id,
        content: sql<string>`${message.parts}::text`,
        chatId: message.chatId,
        chatTitle: chat.title,
        userEmail: user.email,
        createdAt: sql<string>`${message.createdAt}::text`,
        downvotes: sql<number>`COUNT(${vote.isUpvoted})`,
      })
      .from(message)
      .innerJoin(
        vote,
        and(eq(message.id, vote.messageId), eq(vote.isUpvoted, false)),
      )
      .leftJoin(chat, eq(message.chatId, chat.id))
      .leftJoin(user, eq(chat.userId, user.id))
      .where(eq(message.role, 'assistant'))
      .groupBy(message.id, message.chatId, chat.title, user.email)
      .having(sql`COUNT(${vote.isUpvoted}) > 0`)
      .orderBy(desc(sql`COUNT(${vote.isUpvoted})`));

    // For each flagged message, get the most recent user message that came before it
    const enrichedMessages = await Promise.all(
      flaggedMessages.map(async (flagged) => {
        const [userMessage] = await db
          .select({
            content: sql<string>`${message.parts}::text`,
          })
          .from(message)
          .where(
            and(
              eq(message.chatId, flagged.chatId),
              eq(message.role, 'user'),
              sql`${message.createdAt} < ${sql.raw(
                `'${flagged.createdAt}'::timestamp`,
              )}`,
            ),
          )
          .orderBy(desc(message.createdAt))
          .limit(1);

        return {
          messageId: flagged.messageId,
          content: flagged.content,
          chatTitle: flagged.chatTitle,
          userEmail: flagged.userEmail,
          createdAt: flagged.createdAt,
          downvotes: Number(flagged.downvotes),
          userQuery: userMessage?.content || 'No preceding user message found',
        };
      }),
    );

    return enrichedMessages.map((msg) => ({
      ...msg,
      content: msg.content,
    }));
  } catch (error) {
    console.error('Failed to get flagged messages:', error);
    throw error;
  }
});

export { generateTopUseCases, type GenerationProgress, type GenerationSummary };

export async function getUseCasesByCategory(categoryId: string) {
  try {
    const useCases = await db
      .select()
      .from(useCase)
      .where(eq(useCase.categoryId, categoryId))
      .orderBy(desc(useCase.updatedAt));

    return useCases;
  } catch (error) {
    console.error('Failed to get use cases by category:', error);
    throw error;
  }
}
