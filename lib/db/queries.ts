import 'server-only';

import { genSaltSync, hashSync } from 'bcrypt-ts';
import {
  and,
  asc,
  countDistinct,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  lt,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import {
  user,
  chat,
  type User,
  document,
  type Suggestion,
  suggestion,
  message,
  vote,
  type DBMessage,
  type Chat,
  useCase,
  useCaseCategory,
  logo,
  suggestedMessage,
  type operationTypeEnum,
  type operationStatusEnum,
  type SystemOperation,
  type NewSystemOperation,
  systemOperations,
} from './schema';
import type { ArtifactKind } from '@/components/artifact';
import { csvDb } from './client';

// optionally, if not using email/pass login, you can
// use the drizzle adapter for auth.js / nextauth
// https://authjs.dev/reference/adapter/drizzle

const postgresUrl = process.env.POSTGRES_URL;

if (!postgresUrl) {
  throw new Error('POSTGRES_URL environment variable not set.');
}

const client = postgres(postgresUrl);
const db = drizzle(client);

export async function getUser(email: string): Promise<Array<User>> {
  try {
    // Convert email to lowercase for case-insensitive comparison
    const normalizedEmail = email.toLowerCase().trim();
    return await db.select().from(user).where(eq(user.email, normalizedEmail));
  } catch (error) {
    console.error('Failed to get user from database');
    throw error;
  }
}

export async function createUser(email: string, password: string) {
  const salt = genSaltSync(10);
  const hash = hashSync(password, salt);

  try {
    // Convert email to lowercase for case-insensitive storage
    const normalizedEmail = email.toLowerCase().trim();
    return await db.insert(user).values({ email: normalizedEmail, password: hash });
  } catch (error) {
    console.error('Failed to create user in database');
    throw error;
  }
}

export async function saveChat({
  id,
  userId,
  title,
}: {
  id: string;
  userId: string;
  title: string;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId,
      title,
    });
  } catch (error) {
    console.error('Failed to save chat in database');
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));

    const [chatsDeleted] = await db
      .delete(chat)
      .where(eq(chat.id, id))
      .returning();
    return chatsDeleted;
  } catch (error) {
    console.error('Failed to delete chat by id from database');
    throw error;
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<any>) =>
      db
        .select()
        .from(chat)
        .where(
          whereCondition
            ? and(whereCondition, eq(chat.userId, id))
            : eq(chat.userId, id),
        )
        .orderBy(desc(chat.isPinned), desc(chat.updatedAt))
        .limit(extendedLimit);

    let filteredChats: Array<Chat> = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new Error(`Chat with id ${startingAfter} not found`);
      }

      filteredChats = await query(gt(chat.updatedAt, selectedChat.updatedAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new Error(`Chat with id ${endingBefore} not found`);
      }

      filteredChats = await query(lt(chat.updatedAt, selectedChat.updatedAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (error) {
    console.error('Failed to get chats by user from database');
    throw error;
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    console.error('Failed to get chat by id from database');
    throw error;
  }
}

export async function saveMessages({
  messages,
}: {
  messages: Array<DBMessage>;
}) {
  try {
    const result = await db.insert(message).values(messages);
    
    // Update the updatedAt field for all affected chats
    const chatIds = [...new Set(messages.map(msg => msg.chatId))];
    if (chatIds.length > 0) {
      await Promise.all(
        chatIds.map(chatId => 
          db.update(chat)
            .set({ updatedAt: new Date() })
            .where(eq(chat.id, chatId))
        )
      );
    }
    
    return result;
  } catch (error) {
    console.error('Failed to save messages in database', error);
    throw error;
  }
}


export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    console.error('Failed to get messages by chat id from database', error);
    throw error;
  }
}

export async function getPaginatedMessagesByChatId(
  chatId: string,
  { page = 1, limit = 20 }: { page?: number; limit?: number },
): Promise<{
  messages: Array<{
    id: string;
    chatId: string;
    useCaseId: string | null;
    role: string;
    parts: string;
    modelId: string | null;
    inputTokens: number | null;
    outputTokens: number | null;
    createdAt: Date;
    userEmail: string | null;
    agentType: string | null;
  }>;
  totalMessages: number;
  totalPages: number;
  currentPage: number;
}> {
  try {
    const offset = (page - 1) * limit;

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(message)
      .where(eq(message.chatId, chatId));

    // Get paginated messages
    const messages = await db
      .select({
        id: message.id,
        chatId: message.chatId,
        useCaseId: message.useCaseId,
        role: message.role,
        parts: sql<string>`cast(${message.parts} as text)`,
        modelId: message.modelId,
        inputTokens: message.inputTokens,
        outputTokens: message.outputTokens,
        createdAt: message.createdAt,
        userEmail: user.email,
        agentType: message.agentType,
      })
      .from(message)
      .leftJoin(chat, eq(message.chatId, chat.id))
      .leftJoin(user, eq(chat.userId, user.id))
      .where(eq(message.chatId, chatId))
      .orderBy(asc(message.createdAt))
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(count / limit);

    return {
      messages,
      totalMessages: count,
      totalPages,
      currentPage: page,
    };
  } catch (error) {
    console.error('Failed to get paginated messages by chat id from database');
    throw error;
  }
}

export async function countModelTokenUsage(): Promise<
  {
    modelId: string | null;
    inputTokens: number;
    outputTokens: number;
    totalCount: number;
    grandTotal: number;
    percentage: number;
  }[]
> {
  try {
    const totals = db
      .select({
        grandTotal: sql<number>`
      coalesce(sum(${message.inputTokens}) + sum(${message.outputTokens}), 0)
    `.as('grandTotal'),
      })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .as('totals');

    return db
      .with(totals)
      .select({
        modelId: message.modelId,
        inputTokens: sql<number>`
      coalesce(sum(${message.inputTokens}),0)
    `.as('inputTokens'),
        outputTokens: sql<number>`
      coalesce(sum(${message.outputTokens}),0)
    `.as('outputTokens'),
        totalCount: sql<number>`
      coalesce(sum(${message.inputTokens}) + sum(${message.outputTokens}),0)
    `.as('totalCount'),
        grandTotal: totals.grandTotal,
        percentage: sql<number>`
      round(
        (sum(${message.inputTokens}) + sum(${message.outputTokens})) * 100.0
        / ${totals.grandTotal}
      )
    `.as('percentage'),
      })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .innerJoin(totals, sql`true`)
      .groupBy(message.modelId, totals.grandTotal);
  } catch (error) {
    console.error(`Failed to count token usage from database`);
    throw error;
  }
}

export async function countAgentTypeTokenUsage(): Promise<
  {
    agentType: string | null;
    inputTokens: number;
    outputTokens: number;
    totalCount: number;
    grandTotal: number;
    percentage: number;
  }[]
> {
  try {
    const totals = db
      .select({
        grandTotal: sql<number>`
      coalesce(sum(${message.inputTokens}) + sum(${message.outputTokens}), 0)
    `.as('grandTotal'),
      })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .as('totals');

    return db
      .with(totals)
      .select({
        agentType: message.agentType,
        inputTokens: sql<number>`
      coalesce(sum(${message.inputTokens}),0)
    `.as('inputTokens'),
        outputTokens: sql<number>`
      coalesce(sum(${message.outputTokens}),0)
    `.as('outputTokens'),
        totalCount: sql<number>`
      coalesce(sum(${message.inputTokens}) + sum(${message.outputTokens}),0)
    `.as('totalCount'),
        grandTotal: totals.grandTotal,
        percentage: sql<number>`
      round(
        (sum(${message.inputTokens}) + sum(${message.outputTokens})) * 100.0
        / ${totals.grandTotal}
      )
    `.as('percentage'),
      })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .innerJoin(totals, sql`true`)
      .groupBy(message.agentType, totals.grandTotal);
  } catch (error) {
    console.error(`Failed to count token usage by agent type from database`);
    throw error;
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === 'up' })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === 'up',
    });
  } catch (error) {
    console.error('Failed to upvote message in database', error);
    throw error;
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    console.error('Failed to get votes by chat id from database', error);
    throw error;
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    return await db
      .insert(document)
      .values({
        id,
        title,
        kind,
        content,
        userId,
        createdAt: new Date(),
      })
      .returning();
  } catch (error) {
    console.error('Failed to save document in database');
    throw error;
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp),
        ),
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
      .returning();
  } catch (error) {
    console.error(
      'Failed to delete documents by id after timestamp from database',
    );
    throw error;
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    console.error('Failed to save suggestions in database');
    throw error;
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    console.error(
      'Failed to get suggestions by document version from database',
    );
    throw error;
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    console.error('Failed to get message by id from database');
    throw error;
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
      );

    const messageIds = messagesToDelete.map((message) => message.id);

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds)),
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds)),
        );
    }
  } catch (error) {
    console.error(
      'Failed to delete messages by id after timestamp from database',
    );
    throw error;
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    console.error('Failed to update chat visibility in database');
    throw error;
  }
}

export async function updateChatTitle({
  chatId,
  customTitle,
}: {
  chatId: string;
  customTitle: string;
}) {
  try {
    return await db
      .update(chat)
      .set({ 
        customTitle,
        updatedAt: new Date()
      })
      .where(eq(chat.id, chatId));
  } catch (error) {
    console.error('Failed to update chat title in database');
    throw error;
  }
}

export async function toggleChatPinned({
  chatId,
  isPinned,
}: {
  chatId: string;
  isPinned: boolean;
}) {
  try {
    return await db
      .update(chat)
      .set({ 
        isPinned,
        updatedAt: new Date()
      })
      .where(eq(chat.id, chatId));
  } catch (error) {
    console.error('Failed to update chat pinned status in database');
    throw error;
  }
}

export async function getAllUsers() {
  try {
    return await db.select().from(user).orderBy(asc(user.createdAt));
  } catch (error) {
    console.error('Failed to get all users from database');
    throw error;
  }
}

export async function updateUserAdmin({
  userId,
  isAdmin,
}: {
  userId: string;
  isAdmin: boolean;
}) {
  try {
    return await db.update(user).set({ isAdmin }).where(eq(user.id, userId));
  } catch (error) {
    console.error('Failed to update user admin status');
    throw error;
  }
}

export async function deleteUserById(userId: string) {
  try {
    // First delete all related data
    const userChats = await getChatsByUserId({
      id: userId,
      limit: 1000,
      startingAfter: null,
      endingBefore: null,
    });
    for (const chat of userChats.chats) {
      await deleteChatById({ id: chat.id });
    }

    // Delete user's documents
    await db.delete(document).where(eq(document.userId, userId));

    // Finally delete the user
    return await db.delete(user).where(eq(user.id, userId));
  } catch (error) {
    console.error('Failed to delete user');
    throw error;
  }
}

// Add these functions to your database.ts file

export async function setActiveLogo({ logoUrl }: { logoUrl: string }) {
  try {
    // First, set all logos to inactive
    await db.update(logo).set({ isActive: false });

    // Check if the logo with this URL already exists
    const [existingLogo] = await db
      .select()
      .from(logo)
      .where(eq(logo.url, logoUrl));

    if (existingLogo) {
      // If it exists, set it to active
      return await db
        .update(logo)
        .set({
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(logo.id, existingLogo.id));
    } else {
      // If it doesn't exist, create a new one
      return await db.insert(logo).values({
        url: logoUrl,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  } catch (error) {
    console.error('Failed to set active logo in database', error);
    throw error;
  }
}

export async function getActiveLogo() {
  try {
    const [activeLogo] = await db
      .select()
      .from(logo)
      .where(eq(logo.isActive, true));

    return activeLogo;
  } catch (error) {
    console.error('Failed to get active logo from database', error);
    throw error;
  }
}

export async function removeLogo({ logoUrl }: { logoUrl: string }) {
  try {
    const result = await db.delete(logo).where(eq(logo.url, logoUrl));

    // If we deleted the active logo, set another one as active if available
    const [activeLogo] = await db
      .select()
      .from(logo)
      .where(eq(logo.isActive, true));

    if (!activeLogo) {
      const [firstLogo] = await db
        .select()
        .from(logo)
        .orderBy(asc(logo.createdAt))
        .limit(1);

      if (firstLogo) {
        await db
          .update(logo)
          .set({
            isActive: true,
            updatedAt: new Date(),
          })
          .where(eq(logo.id, firstLogo.id));
      }
    }

    return result;
  } catch (error) {
    console.error('Failed to remove logo from database', error);
    throw error;
  }
}

export async function getSuggestedMessagesByModelId(modelId: string) {
  try {
    return await db
      .select()
      .from(suggestedMessage)
      .where(eq(suggestedMessage.modelId, modelId))
      .orderBy(asc(suggestedMessage.position));
  } catch (error) {
    console.error(
      'Failed to get suggested messages by model ID from database',
      error,
    );
    throw error;
  }
}

export async function saveSuggestedMessage({
  modelId,
  title,
  label,
  action,
  position,
}: {
  modelId: string;
  title: string;
  label: string;
  action: string;
  position: string;
}) {
  try {
    // Check if a message already exists for this position and model
    const existingMessages = await db
      .select()
      .from(suggestedMessage)
      .where(
        and(
          eq(suggestedMessage.modelId, modelId),
          eq(suggestedMessage.position, position),
        ),
      );

    if (existingMessages.length > 0) {
      // Update existing message
      return await db
        .update(suggestedMessage)
        .set({
          title,
          label,
          action,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(suggestedMessage.modelId, modelId),
            eq(suggestedMessage.position, position),
          ),
        );
    } else {
      // Create new message
      return await db.insert(suggestedMessage).values({
        modelId,
        title,
        label,
        action,
        position,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  } catch (error) {
    console.error('Failed to save suggested message in database', error);
    throw error;
  }
}

export async function deleteSuggestedMessage({
  modelId,
  position,
}: {
  modelId: string;
  position: string;
}) {
  try {
    return await db
      .delete(suggestedMessage)
      .where(
        and(
          eq(suggestedMessage.modelId, modelId),
          eq(suggestedMessage.position, position),
        ),
      );
  } catch (error) {
    console.error('Failed to delete suggested message from database', error);
    throw error;
  }
}

export async function getAllModelIds() {
  try {
    const result = await db
      .select({ modelId: suggestedMessage.modelId })
      .from(suggestedMessage)
      .groupBy(suggestedMessage.modelId);

    return result.map((item) => item.modelId);
  } catch (error) {
    console.error('Failed to get all model IDs from database', error);
    throw error;
  }
}

export async function createUseCaseCategory({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  try {
    return await db.insert(useCaseCategory).values({
      title,
      description,
    });
  } catch (error) {
    console.error('Failed to create use case category in database', error);
    throw error;
  }
}

export async function createUseCase({
  categoryId,
  title,
  description,
}: {
  categoryId: string;
  title: string;
  description?: string;
}) {
  try {
    return await db.insert(useCase).values({
      categoryId,
      title,
      description,
    });
  } catch (error) {
    console.error('Failed to create use case in database', error);
    throw error;
  }
}

export async function getMessagesByUseCaseId({
  useCaseId,
}: {
  useCaseId: string;
}) {
  try {
    return await db
      .select({
        id: message.id,
        role: message.role,
        parts: message.parts,
        modelId: message.modelId,
        inputTokens: message.inputTokens,
        outputTokens: message.outputTokens,
        createdAt: message.createdAt,
        userEmail: user.email,
      })
      .from(message)
      .leftJoin(chat, eq(message.chatId, chat.id))
      .leftJoin(user, eq(chat.userId, user.id))
      .where(eq(message.useCaseId, useCaseId))
      .orderBy(message.createdAt);
  } catch (error) {
    console.error('Failed to get messages by use case id from database');
    throw error;
  }
}

export async function getAllUseCaseCategories(
  { page = 1, limit = 10 }: { page?: number; limit?: number },
  searchParams?: { query?: string; filter?: 'categories' | 'all' },
  dateFilter?: 'all' | 'week' | 'month' | 'year' | 'custom',
  customDateRange?: { from: Date; to: Date },
) {
  try {
    const { query: searchQuery, filter: searchFilter = 'categories' } =
      searchParams || {};
    const offset = (page - 1) * limit;
    const searchPattern = searchQuery ? `%${searchQuery}%` : null;

    let startDate: Date | undefined;
    if (dateFilter && dateFilter !== 'all') {
      const now = new Date();
      startDate = new Date();
      switch (dateFilter) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        case 'custom':
          if (customDateRange) startDate = customDateRange.from;
          break;
      }
    }
    let dateCondition: SQL | undefined;
    if (startDate) {
      const endDate =
        dateFilter === 'custom' && customDateRange
          ? customDateRange.to
          : new Date();
      dateCondition = sql`(${useCase.createdAt} >= ${startDate} AND ${useCase.createdAt} <= ${endDate})`;
    }

    let searchCondition: SQL | undefined;
    if (searchPattern) {
      const categorySearch = or(
        ilike(useCaseCategory.title, searchPattern),
        ilike(useCaseCategory.description, searchPattern),
      );
      if (searchFilter === 'all') {
        const useCaseSearch = or(
          ilike(useCase.title, searchPattern),
          ilike(useCase.description, searchPattern),
        );
        searchCondition = or(
          categorySearch,
          sql`${useCaseCategory.id} IN (SELECT uc_search."categoryId" FROM ${useCase} uc_search WHERE ${useCaseSearch})`,
        );
      } else {
        searchCondition = categorySearch;
      }
    }

    const finalConditions: (SQL | undefined)[] = [
      searchCondition,
      dateCondition,
    ];
    const whereClause = and(...finalConditions.filter(Boolean));

    const relevanceScore = searchPattern
      ? sql`
        CASE
            WHEN ${useCaseCategory.title} ILIKE ${searchQuery} THEN 100
            WHEN ${useCaseCategory.title} ILIKE ${searchPattern} THEN 50
            WHEN ${useCaseCategory.description} ILIKE ${searchQuery} THEN 80
            WHEN ${useCaseCategory.description} ILIKE ${searchPattern} THEN 40
            ${
              searchFilter === 'all'
                ? sql`
                WHEN EXISTS (SELECT 1 FROM ${useCase} uc_score WHERE uc_score."categoryId" = ${useCaseCategory.id} AND uc_score.title ILIKE ${searchPattern}) THEN 30
                WHEN EXISTS (SELECT 1 FROM ${useCase} uc_score WHERE uc_score."categoryId" = ${useCaseCategory.id} AND uc_score.description ILIKE ${searchPattern}) THEN 20
            `
                : sql``
            }
            ELSE 0
        END
    `
      : sql`0`;

    const relevance = sql`${relevanceScore}`.as('relevance');
    const useCaseCount =
      sql<number>`cast(count(distinct ${useCase.id}) as int)`.as(
        'use_case_count',
      );

    const baseQuery = db
      .select({
        id: useCaseCategory.id,
        title: useCaseCategory.title,
        description: useCaseCategory.description,
        createdAt: useCaseCategory.createdAt,
        updatedAt: useCaseCategory.updatedAt,
        useCaseCount: useCaseCount,
        uniqueUserCount:
          sql<number>`cast(count(distinct ${user.id}) as int)`.as(
            'uniqueUserCount',
          ),
        relevance: relevance,
      })
      .from(useCaseCategory)
      .leftJoin(useCase, eq(useCaseCategory.id, useCase.categoryId))
      .leftJoin(message, eq(message.useCaseId, useCase.id))
      .leftJoin(chat, eq(message.chatId, chat.id))
      .leftJoin(user, eq(chat.userId, user.id))
      .where(whereClause)
      .groupBy(useCaseCategory.id)
      .orderBy(desc(relevance), desc(useCaseCount));

    const totalCountResult = await db
      .select({ totalCount: countDistinct(useCaseCategory.id) })
      .from(useCaseCategory)
      .leftJoin(useCase, eq(useCaseCategory.id, useCase.categoryId))
      .where(whereClause);

    const totalCategories = totalCountResult[0]?.totalCount ?? 0;

    const finalQuery = baseQuery.limit(limit).offset(offset);

    const categoriesResult = await finalQuery;

    const categories = categoriesResult.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      useCaseCount: row.useCaseCount,
      relevance: typeof row.relevance === 'number' ? row.relevance : 0,
      uniqueUserCount: row.uniqueUserCount ?? 0,
    }));

    const totalPages = Math.ceil(totalCategories / limit);

    return {
      categories,
      totalCategories,
      totalPages,
      currentPage: page,
    };
  } catch (error) {
    console.error(
      'Failed to get all use case categories with search/pagination:',
      error,
    );
    throw error;
  }
}

export async function getUseCasesByCategory(
  categoryId: string,
  { page = 1, limit = 5 }: { page?: number; limit?: number } = {},
  searchQuery?: string,
) {
  try {
    const offset = (page - 1) * limit;
    const searchPattern = searchQuery ? `%${searchQuery}%` : null;

    // First verify the category exists
    const category = await db
      .select()
      .from(useCaseCategory)
      .where(eq(useCaseCategory.id, categoryId))
      .limit(1);

    if (!category || category.length === 0) {
      console.error(`Category ${categoryId} not found`);
      return {
        useCases: [],
        totalUseCases: 0,
        totalPages: 0,
        currentPage: page,
      };
    }

    // Base condition: always filter by categoryId
    const baseCondition = eq(useCase.categoryId, categoryId);

    // Add search condition if query exists
    let searchCondition: SQL | undefined;
    if (searchPattern && searchQuery) {
      // Ensure both exist
      searchCondition = or(
        ilike(useCase.title, searchPattern),
        ilike(useCase.description, searchPattern),
      );
    }

    // Combine conditions
    const finalConditions = and(
      ...[baseCondition, searchCondition].filter(Boolean),
    );

    // Calculate relevance score if searchQuery exists
    let relevanceScore = sql`0`;
    if (searchPattern && searchQuery) {
      // Ensure both exist for relevance calculation
      relevanceScore = sql`
        CASE
            WHEN ${useCase.title} ILIKE ${searchQuery} THEN 100
            WHEN ${useCase.title} ILIKE ${searchPattern} THEN 50
            WHEN ${useCase.description} ILIKE ${searchQuery} THEN 80
            WHEN ${useCase.description} ILIKE ${searchPattern} THEN 40
            ELSE 0
        END
      `;
    }
    const relevance = sql`${relevanceScore}`.as('relevance');

    // Get total count, applying search filter
    const totalCountQuery = await db
      .select({ totalCount: sql<number>`cast(count(*) as int)` })
      .from(useCase)
      .where(finalConditions); // Apply combined conditions

    const totalUseCases = totalCountQuery[0]?.totalCount ?? 0;
    const totalPages = Math.ceil(totalUseCases / limit);

    // Get paginated use cases, sorted by relevance if searching
    const useCasesQuery = db
      .select({
        id: useCase.id,
        title: useCase.title,
        description: useCase.description,
        type: useCase.type,
        topic: useCase.topic,
        timeSaved: useCase.timeSaved,
        createdAt: useCase.createdAt,
        updatedAt: useCase.updatedAt,
        chatId: useCase.chatId,
        relevance: relevance, // Include relevance in selection
      })
      .from(useCase)
      .where(finalConditions) // Apply combined conditions
      .orderBy(searchQuery ? desc(relevance) : desc(useCase.updatedAt)) // Sort by relevance if searching, else by date
      .limit(limit)
      .offset(offset);

    const useCasesResult = await useCasesQuery;

    // Map results, ensuring relevance is a number
    const useCases = useCasesResult.map((uc) => ({
      ...uc,
      relevance: typeof uc.relevance === 'number' ? uc.relevance : 0,
    }));

    return {
      useCases,
      totalUseCases,
      totalPages,
      currentPage: page,
    };
  } catch (error) {
    console.error(`Failed to get use cases for category ${categoryId}:`, error);
    throw error;
  }
}

// Function to get the latest use case for a specific chat ID
export async function getLatestUseCaseByChatId(chatId: string) {
  try {
    const [latestUseCase] = await db
      .select()
      .from(useCase)
      .where(eq(useCase.chatId, chatId))
      .orderBy(desc(useCase.createdAt)) // Order by creation date descending
      .limit(1); // Get only the most recent one

    if (latestUseCase) {
    } else {
      console.log(`No use case found for chat ${chatId}`);
    }
    return latestUseCase; // Returns the use case object or undefined
  } catch (error) {
    console.error(`Failed to get latest use case for chat ${chatId}:`, error);
    throw error;
  }
}

// Function to efficiently get the latest use cases for multiple chat IDs in one operation
export async function getLatestUseCasesForChatIds(
  chatIds: string[],
): Promise<Map<string, any>> {
  if (chatIds.length === 0) {
    return new Map();
  }

  try {
    // This approach uses a common SQL pattern to get the most recent use case per chat ID
    // We use a CTE (Common Table Expression) to rank use cases by creation date within each chat ID
    const query = sql`
      WITH RankedUseCases AS (
        SELECT 
          uc.*,
          ROW_NUMBER() OVER (PARTITION BY uc."chatId" ORDER BY uc."createdAt" DESC) as rn
        FROM "UseCase" uc
        WHERE uc."chatId" IN (${sql.join(chatIds, sql`, `)})
      )
      SELECT * FROM RankedUseCases WHERE rn = 1
    `;

    const latestUseCases = await db.execute(query);

    // Convert to Map of chatId -> useCase
    const resultMap = new Map<string, any>();
    for (const uc of latestUseCases) {
      if (uc && typeof uc.chatId === 'string') {
        resultMap.set(uc.chatId, uc);
      }
    }

    return resultMap;
  } catch (error) {
    console.error(`Failed to batch fetch latest use cases:`, error);
    throw error;
  }
}

/**
 * Fetches aggregated data for the use case analytics dashboard.
 * Includes overall usage, category distribution, and current vs. previous month trend
 * data based on **distinct use cases activated** per category.
 */
export async function getUseCaseAnalyticsData() {
  try {
    // --- Overall Usage Over Time (Monthly Message Count - Unchanged) ---
    const overallUsageOverTime = await db
      .select({
        month: sql<string>`to_char(${message.createdAt}, 'YYYY-MM')`.as(
          'month',
        ),
        count: sql<number>`cast(count(${message.id}) as int)`.as('count'),
      })
      .from(message)
      .groupBy(sql`to_char(${message.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${message.createdAt}, 'YYYY-MM')`);

    // --- Category Distribution & Trends (Distinct Use Cases: Current vs. Previous Month) ---
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
    const startOfPreviousMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfPreviousMonth = startOfCurrentMonth;
    const startOfNextMonth = new Date(currentYear, currentMonth + 1, 1);

    // Subquery for Current Month Distinct Use Case Counts per Category
    const currentMonthDistinctUCCountsSubquery = db
      .select({
        categoryId: useCase.categoryId,
        // Count DISTINCT use cases that had messages this month
        currentMonthDistinctUCCount: countDistinct(useCase.id).as(
          'currentMonthDistinctUCCount',
        ),
      })
      .from(message)
      .innerJoin(useCase, eq(message.useCaseId, useCase.id)) // INNER JOIN ensures message belongs to a use case
      .where(
        and(
          gte(message.createdAt, startOfCurrentMonth),
          lt(message.createdAt, startOfNextMonth),
          sql`${useCase.categoryId} IS NOT NULL`,
        ),
      )
      .groupBy(useCase.categoryId)
      .as('current_month_distinct_uc_counts');

    // Subquery for Previous Month Distinct Use Case Counts per Category
    const previousMonthDistinctUCCountsSubquery = db
      .select({
        categoryId: useCase.categoryId,
        // Count DISTINCT use cases that had messages last month
        previousMonthDistinctUCCount: countDistinct(useCase.id).as(
          'previousMonthDistinctUCCount',
        ),
      })
      .from(message)
      .innerJoin(useCase, eq(message.useCaseId, useCase.id))
      .where(
        and(
          gte(message.createdAt, startOfPreviousMonth),
          lt(message.createdAt, endOfPreviousMonth),
          sql`${useCase.categoryId} IS NOT NULL`,
        ),
      )
      .groupBy(useCase.categoryId)
      .as('previous_month_distinct_uc_counts');

    // Main query joining category info with total message counts and monthly distinct UC counts
    const categoryDistributionAndTrends = await db
      .select({
        categoryId: useCaseCategory.id,
        categoryTitle: useCaseCategory.title,
        // Keep total message count for overall context if desired
        totalMessageCount:
          sql<number>`cast(count(distinct ${message.id}) as int)`.as(
            'totalMessageCount',
          ),
        // Add unique user count
        uniqueUserCount:
          sql<number>`cast(count(distinct ${user.id}) as int)`.as(
            'uniqueUserCount',
          ),
        // Aggregate distinct UC counts using MAX (as subquery join yields one row per cat)
        currentMonthDistinctUCCount:
          sql<number>`coalesce(max(${currentMonthDistinctUCCountsSubquery.currentMonthDistinctUCCount}), 0)`.as(
            'currentMonthDistinctUCCount',
          ),
        previousMonthDistinctUCCount:
          sql<number>`coalesce(max(${previousMonthDistinctUCCountsSubquery.previousMonthDistinctUCCount}), 0)`.as(
            'previousMonthDistinctUCCount',
          ),
      })
      .from(useCaseCategory)
      // Join for total message counts (optional, could be removed if not needed)
      .leftJoin(useCase, eq(useCase.categoryId, useCaseCategory.id))
      .leftJoin(message, eq(message.useCaseId, useCase.id))
      // Add joins to get to user table
      .leftJoin(chat, eq(message.chatId, chat.id))
      .leftJoin(user, eq(chat.userId, user.id))
      // Join for current month distinct UC counts
      .leftJoin(
        currentMonthDistinctUCCountsSubquery,
        eq(useCaseCategory.id, currentMonthDistinctUCCountsSubquery.categoryId),
      )
      // Join for previous month distinct UC counts
      .leftJoin(
        previousMonthDistinctUCCountsSubquery,
        eq(
          useCaseCategory.id,
          previousMonthDistinctUCCountsSubquery.categoryId,
        ),
      )
      .groupBy(useCaseCategory.id, useCaseCategory.title)
      .orderBy(desc(sql<number>`cast(count(distinct ${message.id}) as int)`)); // Still ordering by total messages, could change

    console.log(
      '[Analytics Query - Distinct UC] Raw Category Counts:',
      JSON.stringify(categoryDistributionAndTrends, null, 2),
    );

    // --- Time Saved Analysis (Raw Data - unchanged) ---
    const timeSavedData = await db
      .select({
        categoryId: useCase.categoryId,
        timeSaved: useCase.timeSaved,
      })
      .from(useCase)
      .where(sql`${useCase.timeSaved} IS NOT NULL`);

    // --- Combine Results ---
    const analyticsData = {
      usageOverTime: overallUsageOverTime.map((row) => ({
        ...row,
        month: row.month ?? 'Unknown',
      })),
      categoryDistribution: categoryDistributionAndTrends.map((row) => ({
        categoryId: row.categoryId,
        categoryTitle: row.categoryTitle ?? 'Uncategorized',
        count: row.totalMessageCount ?? 0, // Total messages (can be kept or removed)
        uniqueUserCount: row.uniqueUserCount ?? 0, // Add unique user count
        // Store the distinct UC counts for trend calculation
        currentMonthCount: row.currentMonthDistinctUCCount ?? 0, // Using the distinct UC count here
        previousMonthCount: row.previousMonthDistinctUCCount ?? 0, // Using the distinct UC count here
        // Sparkline data still based on the two month counts (representing distinct UCs now)
        recentMonthlyData: [
          {
            month: `${startOfPreviousMonth.getFullYear()}-${String(
              startOfPreviousMonth.getMonth() + 1,
            ).padStart(2, '0')}`,
            count: row.previousMonthDistinctUCCount ?? 0,
          },
          {
            month: `${startOfCurrentMonth.getFullYear()}-${String(
              startOfCurrentMonth.getMonth() + 1,
            ).padStart(2, '0')}`,
            count: row.currentMonthDistinctUCCount ?? 0,
          },
        ],
      })),
      rawTimeSaved: timeSavedData.filter(
        (row) => row.categoryId && row.timeSaved,
      ),
    };

    console.log(
      '[Analytics Query - Distinct UC] Final Processed Data:',
      JSON.stringify(analyticsData.categoryDistribution, null, 2),
    );

    return analyticsData;
  } catch (error) {
    console.error(
      'Failed to get use case analytics data (Distinct UC Trends):',
      error,
    );
    throw error;
  }
}

/**
 * Merges messages into existing use cases and marks them as processed
 *
 * @param messagesToMerge - Array of message groups to merge into use cases
 * @returns Number of messages successfully merged
 */
export async function mergeMessagesIntoUseCase(
  messagesToMerge: Array<{
    useCaseId: string;
    messageIds: string[];
  }>,
): Promise<number> {
  let mergedCount = 0;

  if (messagesToMerge.length === 0) {
    return 0;
  }

  for (const mergeInfo of messagesToMerge) {
    try {
      // Update messages: assign use case ID and mark as processed
      await db
        .update(message)
        .set({
          useCaseId: mergeInfo.useCaseId,
          processed: true,
        })
        .where(inArray(message.id, mergeInfo.messageIds));

      const updatedMessageCount = mergeInfo.messageIds.length;

      if (updatedMessageCount > 0) {
        mergedCount += updatedMessageCount;
      } else {
        console.warn(
          `  Attempted to merge messages into UseCase ${mergeInfo.useCaseId}, but message ID list was empty.`,
        );
      }
    } catch (error) {
      console.error(
        `  Error merging messages into UseCase ID ${mergeInfo.useCaseId}:`,
        error,
      );
      // Continue processing other merge operations despite this error
    }
  }

  return mergedCount;
}

/**
 * Get total time saved per category
 * Calculate the sum of timeSaved across all use cases in each category
 */
export async function getTimeSavedPerCategory() {
  try {
    const rawTimeSavedData = await db
      .select({
        categoryId: useCase.categoryId,
        timeSaved: useCase.timeSaved,
      })
      .from(useCase)
      .where(sql`${useCase.timeSaved} IS NOT NULL`);

    // Process the data to sum up minutes per category
    const categoryTotals = new Map<string, number>();

    for (const item of rawTimeSavedData) {
      // Skip invalid entries
      if (!item.categoryId || !item.timeSaved) continue;

      // Extract time value from strings like "5h", "30m", "2d"
      const match = String(item.timeSaved)
        .trim()
        .match(/(\d+(\.\d+)?)\s*([hmd])/);
      if (!match) continue;

      const value = Number.parseFloat(match[1]);
      const unit = match[3];

      let minutes = 0;
      if (unit === 'h') minutes = value * 60;
      else if (unit === 'm') minutes = value;
      else if (unit === 'd') minutes = value * 24 * 60;

      // Add to category total
      const currentTotal = categoryTotals.get(item.categoryId) || 0;
      categoryTotals.set(item.categoryId, currentTotal + minutes);
    }

    // Convert to a simple object for JSON serialization
    const result: Record<string, string> = {};
    for (const [categoryId, minutes] of categoryTotals.entries()) {
      result[categoryId] = String(minutes);
    }
    return result;
  } catch (error) {
    console.error('Failed to calculate time saved per category:', error);
    throw error;
  }
}

/**
 * Execute a SQL query on any CSV table
 * @param sqlQuery SQL query to execute
 * @returns Query results
 */
export async function executeCsvQuery(sqlQuery: string) {
  try {
    // CENTRALIZED SECURITY VALIDATION
    // This is the ONLY place where SQL validation happens to avoid conflicts
    
    const upperQuery = sqlQuery.trim().toUpperCase();
    const trimmedQuery = upperQuery.trim();
    
    // 1. Only allow SELECT and WITH statements
    if (!trimmedQuery.startsWith('SELECT') && !trimmedQuery.startsWith('WITH')) {
      throw new Error('Query must start with SELECT or WITH');
    }

    // 2. Prevent destructive operations using word boundaries to avoid false positives
    const dangerousKeywords = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'TRUNCATE', 'GRANT', 'REVOKE'];
    for (const keyword of dangerousKeywords) {
      // Use word boundaries to match only complete keywords, not parts of column names
      const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (keywordRegex.test(sqlQuery)) {
        throw new Error(`Dangerous keyword "${keyword}" detected. Only SELECT queries are permitted.`);
      }
    }

    // Execute raw SQL query using csvDb connection
    const result = await csvDb.execute(sql.raw(sqlQuery));

    // Convert results to safe JSON format
    return result.map((row: Record<string, any>) => {
      const safeRow: Record<string, any> = {};
      for (const [key, value] of Object.entries(row)) {
        // Handle special number formats (convert comma to period)
        if (
          typeof value === 'string' &&
          value.includes(',') &&
          /^-?\d+,\d+$/.test(value)
        ) {
          // Convert comma-formatted numbers to JS numbers
          safeRow[key] = Number.parseFloat(value.replace(',', '.'));
        } else {
          safeRow[key] = value;
        }
      }
      return safeRow;
    });
  } catch (error) {
    console.error('Failed to execute CSV query:', error);
    throw error;
  }
}

/**
 * Get all available CSV tables from the database schema
 * @returns Array of CSV table information
 */
export async function listCsvTables() {
  try {
    // Query the information_schema to get all tables
    const tablesQuery = `
      SELECT 
        table_name as "tableName",
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as "columnCount",
        (SELECT pg_total_relation_size(quote_ident(t.table_name)::regclass)) as "tableSize"
      FROM 
        information_schema.tables t
      WHERE 
        table_schema = 'public' AND
        table_type = 'BASE TABLE' AND
        table_name NOT IN (
          'User', 'Chat', 'Message', 'Vote', 'Document', 'Suggestion', 
          'UseCaseCategory', 'UseCase', 'Logo', 'SuggestedMessage', 'system_prompts'
        )
      ORDER BY 
        table_name ASC
    `;

    const tables = await csvDb.execute(sql.raw(tablesQuery));

    // For each table, get the row count
    const tablesWithRowCount = await Promise.all(
      tables.map(async (table: any) => {
        try {
          const countQuery = `SELECT COUNT(*) as "rowCount" FROM "${table.tableName}"`;
          const countResult = await csvDb.execute(sql.raw(countQuery));
          // Handle different possible return types safely
          const rawCount = countResult[0]?.rowCount;
          const rowCount =
            typeof rawCount === 'number'
              ? rawCount
              : typeof rawCount === 'string'
              ? Number.parseInt(rawCount, 10)
              : 0;

          return {
            tableName: table.tableName,
            rowCount: rowCount,
            columnCount: Number.parseInt(table.columnCount || '0', 10),
            tableSize: Number.parseInt(table.tableSize || '0', 10),
            lastUpdated: new Date().toISOString(), // Not stored in schema, using current time
          };
        } catch (error) {
          console.error(
            `Error getting row count for ${table.tableName}:`,
            error,
          );
          return {
            tableName: table.tableName,
            rowCount: 0,
            columnCount: Number.parseInt(table.columnCount || '0', 10),
            tableSize: Number.parseInt(table.tableSize || '0', 10),
            lastUpdated: new Date().toISOString(),
          };
        }
      }),
    );

    return tablesWithRowCount;
  } catch (error) {
    console.error('Failed to list CSV tables:', error);
    throw error;
  }
}

export async function createSystemOperation(
  type: (typeof operationTypeEnum.enumValues)[number],
  initialStatus: (typeof operationStatusEnum.enumValues)[number] = 'STARTED',
  details?: any,
): Promise<SystemOperation | null> {
  try {
    const newOp: NewSystemOperation = {
      operationType: type,
      currentStatus: initialStatus,
      progressDetails: details || {},
      startedAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await db.insert(systemOperations).values(newOp).returning();
    return result[0] || null;
  } catch (error) {
    console.error(`Error creating system operation (type: ${type}):`, error);
    // If it's a unique constraint violation, it means an operation is already active
    if (error instanceof Error && (error as any).code === '23505') {
      // Postgres unique violation
      throw new Error(`An operation of type '${type}' is already in progress.`);
    }
    throw error;
  }
}

export async function updateSystemOperation(
  id: number,
  status: (typeof operationStatusEnum.enumValues)[number],
  details?: any,
  errorMessage?: string | null,
  bedrockJobId?: string | null,
): Promise<SystemOperation | null> {
  const updates: Partial<SystemOperation> = {
    currentStatus: status,
    progressDetails: details,
    updatedAt: new Date(), // This will be set by $onUpdateFn, but good to be explicit
  };
  if (errorMessage !== undefined) updates.errorMessage = errorMessage;
  if (bedrockJobId !== undefined) updates.lastBedrockJobId = bedrockJobId;
  if (status === 'COMPLETED' || status === 'FAILED') {
    updates.endedAt = new Date();
  }
  const result = await db
    .update(systemOperations)
    .set(updates)
    .where(eq(systemOperations.id, id))
    .returning();
  return result[0] || null;
}

export async function getActiveSystemOperation(
  type: (typeof operationTypeEnum.enumValues)[number],
): Promise<SystemOperation | null> {
  const activeStatuses: Array<(typeof operationStatusEnum.enumValues)[number]> =
    [
      'STARTED',
      'PULLING_FROM_SHAREPOINT',
      'UPLOADING_TO_S3',
      'FLAGGING_FOR_BEDROCK',
      'BEDROCK_PROCESSING_SUBMITTED',
      'BEDROCK_POLLING_STATUS',
    ];
  const result = await db
    .select()
    .from(systemOperations)
    .where(
      and(
        eq(systemOperations.operationType, type),
        inArray(systemOperations.currentStatus, activeStatuses),
      ),
    )
    .orderBy(desc(systemOperations.startedAt))
    .limit(1);
  return result[0] || null;
}

export async function getLatestOperationStatus(
  type: (typeof operationTypeEnum.enumValues)[number],
): Promise<SystemOperation | null> {
  const result = await db
    .select()
    .from(systemOperations)
    .where(eq(systemOperations.operationType, type))
    .orderBy(desc(systemOperations.startedAt))
    .limit(1);
  return result[0] || null;
}

export async function cleanupStaleOperations() {
  const activeStatuses: Array<(typeof operationStatusEnum.enumValues)[number]> =
    [
      'STARTED',
      'PULLING_FROM_SHAREPOINT',
      'UPLOADING_TO_S3',
      'FLAGGING_FOR_BEDROCK',
      'BEDROCK_PROCESSING_SUBMITTED',
      'BEDROCK_POLLING_STATUS',
    ];

  // Find ALL operations that are in active states (no date filtering needed)
  const activeOps = await db
    .select({ id: systemOperations.id })
    .from(systemOperations)
    .where(inArray(systemOperations.currentStatus, activeStatuses));

  if (activeOps.length > 0) {
    console.warn(
      `Found ${activeOps.length} active operations interrupted by app restart. Marking as FAILED.`,
    );

    for (const op of activeOps) {
      await updateSystemOperation(
        op.id,
        'FAILED',
        { message: 'Operation interrupted by application restart.' },
        'Operation marked as FAILED due to application restart.',
      );
    }

    console.log(
      `✅ Successfully marked ${activeOps.length} interrupted operations as FAILED.`,
    );
  } else {
    console.log('ℹ️ No active operations found that need cleanup.');
  }
}
