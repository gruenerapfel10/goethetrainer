import 'server-only';

import { genSaltSync, hashSync } from 'bcrypt-ts';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export interface User {
  id: string;
  email: string;
  password: string | null;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type VisibilityType = 'private' | 'public';

export interface Chat {
  id: string;
  userId: string;
  title: string;
  customTitle?: string | null;
  visibility: VisibilityType;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DBMessage {
  id: string;
  chatId: string;
  role: 'user' | 'assistant';
  parts: any[];
  attachments?: any[];
  createdAt: Date;
  agentType?: string;
  useCaseId?: string | null;
  modelId?: string;
  inputTokens?: number;
  outputTokens?: number;
  processed?: boolean;
}

export interface Vote {
  id: string;
  chatId: string;
  messageId: string;
  isUpvoted: boolean;
  createdAt: Date;
}

export interface ReadingListEntry {
  id: string;
  userId: string;
  text: string;
  translation: string;
  createdAt: Date;
}

function readingListCollection(userId: string) {
  return adminDb.collection('users').doc(userId).collection('readingList');
}

export async function getUser(email: string): Promise<Array<User>> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const querySnapshot = await adminDb.collection('users').where('email', '==', normalizedEmail).get();
    
    if (querySnapshot.empty) return [];
    
    const userDoc = querySnapshot.docs[0];
    const data = userDoc.data();
    return [{
      id: userDoc.id,
      email: data.email,
      password: data.password || null,
      isAdmin: data.isAdmin,
      createdAt: (data.createdAt as Timestamp).toDate(),
      updatedAt: (data.createdAt as Timestamp).toDate(),
    }] as User[];
  } catch (error) {
    console.error('Failed to get user from Firestore');
    throw error;
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const querySnapshot = await adminDb.collection('users').where('email', '==', normalizedEmail).get();
    
    if (querySnapshot.empty) return null;
    
    const userDoc = querySnapshot.docs[0];
    const data = userDoc.data();
    return {
      id: userDoc.id,
      email: data.email,
      password: data.password || null,
      isAdmin: data.isAdmin,
      createdAt: (data.createdAt as Timestamp).toDate(),
      updatedAt: (data.createdAt as Timestamp).toDate(),
    };
  } catch (error) {
    console.error('Failed to get user by email from Firestore');
    throw error;
  }
}

export async function createUser(emailOrData: string | { email: string; isAdmin?: boolean }, password?: string) {
  try {
    const normalizedEmail = typeof emailOrData === 'string' 
      ? emailOrData.toLowerCase().trim()
      : emailOrData.email.toLowerCase().trim();
    
    const isAdmin = typeof emailOrData === 'object' ? emailOrData.isAdmin || false : false;
    
    // If password is provided, hash it; otherwise create user without password (for OAuth)
    let hashedPassword = null;
    if (typeof emailOrData === 'string' && password) {
      const salt = genSaltSync(10);
      hashedPassword = hashSync(password, salt);
    }
    
    const userRef = adminDb.collection('users').doc();
    
    await userRef.set({
      email: normalizedEmail,
      password: hashedPassword,
      isAdmin: isAdmin,
      createdAt: Timestamp.now(),
    });
    return [];
  } catch (error) {
    console.error('Failed to create user in Firestore');
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
    const now = new Date();
    const chatRef = adminDb.collection('chats').doc(id);
    
    await chatRef.set({
      id,
      userId,
      title,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
      visibility: 'private',
      isPinned: false,
    });
    return [{ id }];
  } catch (error) {
    console.error('Failed to save chat to Firestore');
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    const messagesSnapshot = await adminDb.collection('chats').doc(id).collection('messages').get();
    const deletePromises = messagesSnapshot.docs.map(messageDoc => messageDoc.ref.delete());
    await Promise.all(deletePromises);
    
    const votesSnapshot = await adminDb.collection('chats').doc(id).collection('votes').get();
    const deleteVotePromises = votesSnapshot.docs.map(voteDoc => voteDoc.ref.delete());
    await Promise.all(deleteVotePromises);
    
    await adminDb.collection('chats').doc(id).delete();
    return { id };
  } catch (error) {
    console.error('Failed to delete chat by id from Firestore');
    throw error;
  }
}

export async function addReadingListEntry({
  userId,
  text,
  translation,
}: {
  userId: string;
  text: string;
  translation: string;
}): Promise<ReadingListEntry> {
  try {
    const now = Timestamp.now();
    const docRef = readingListCollection(userId).doc();
    await docRef.set({
      text,
      translation,
      createdAt: now,
    });

    return {
      id: docRef.id,
      userId,
      text,
      translation,
      createdAt: now.toDate(),
    };
  } catch (error) {
    console.error('Failed to add reading list entry:', error);
    throw error;
  }
}

export async function getReadingListEntries({
  userId,
  limit = 25,
  cursor,
  search,
}: {
  userId: string;
  limit?: number;
  cursor?: string | null;
  search?: string | null;
}): Promise<{ items: ReadingListEntry[]; nextCursor: string | null }> {
  try {
    const fetchLimit = search ? limit * 3 + 1 : limit + 1;
    let query = readingListCollection(userId)
      .orderBy('createdAt', 'desc')
      .limit(fetchLimit);

    if (cursor) {
      query = query.startAfter(Timestamp.fromMillis(Date.parse(cursor)));
    }

    const snapshot = await query.get();
    const rawItems: ReadingListEntry[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId,
        text: data.text,
        translation: data.translation,
        createdAt: (data.createdAt as Timestamp).toDate(),
      };
    });

    const normalizedSearch = search?.trim().toLowerCase();
    const filtered = normalizedSearch
      ? rawItems.filter(entry =>
          entry.text.toLowerCase().includes(normalizedSearch) ||
          entry.translation.toLowerCase().includes(normalizedSearch)
        )
      : rawItems;

    const limitedItems = filtered.slice(0, limit);
    const hasMore = filtered.length > limit;
    const nextCursor =
      hasMore && limitedItems.length > 0
        ? limitedItems[limitedItems.length - 1].createdAt.toISOString()
        : null;

    return {
      items: limitedItems,
      nextCursor,
    };
  } catch (error) {
    console.error('Failed to fetch reading list entries:', error);
    throw error;
  }
}

export async function deleteReadingListEntry({
  userId,
  entryId,
}: {
  userId: string;
  entryId: string;
}): Promise<void> {
  try {
    const docRef = readingListCollection(userId).doc(entryId);
    await docRef.delete();
  } catch (error) {
    console.error('Failed to delete reading list entry:', error);
    throw error;
  }
}

export async function getChatsByUserId({
  id,
  limit = 50,
  offset = 0,
}: {
  id: string;
  limit?: number;
  offset?: number;
}) {
  try {
    const pinnedQuery = adminDb
      .collection('chats')
      .where('userId', '==', id)
      .where('isPinned', '==', true)
      .orderBy('updatedAt', 'desc')
      .limit(limit);
    
    const unpinnedQuery = adminDb
      .collection('chats')
      .where('userId', '==', id)
      .where('isPinned', '==', false)
      .orderBy('updatedAt', 'desc')
      .limit(limit);
    
    const [pinnedSnapshot, unpinnedSnapshot] = await Promise.all([
      pinnedQuery.get(),
      unpinnedQuery.get()
    ]);
    
    const pinnedChats = pinnedSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        title: data.title,
        customTitle: data.customTitle || null,
        visibility: (data.visibility || 'private') as VisibilityType,
        isPinned: data.isPinned || false,
        createdAt: (data.createdAt as Timestamp).toDate(),
        updatedAt: (data.updatedAt as Timestamp).toDate(),
      } as Chat;
    });
    
    const unpinnedChats = unpinnedSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        title: data.title,
        customTitle: data.customTitle || null,
        visibility: (data.visibility || 'private') as VisibilityType,
        isPinned: data.isPinned || false,
        createdAt: (data.createdAt as Timestamp).toDate(),
        updatedAt: (data.updatedAt as Timestamp).toDate(),
      } as Chat;
    });
    
    return [...pinnedChats, ...unpinnedChats].slice(offset, offset + limit);
  } catch (error) {
    console.error('Failed to get chats by user id from Firestore');
    throw error;
  }
}

export async function getChatById({ id }: { id: string }): Promise<Chat | null> {
  try {
    const chatDoc = await adminDb.collection('chats').doc(id).get();
    
    if (!chatDoc.exists) return null;
    
    const data = chatDoc.data()!;
    return {
      id: chatDoc.id,
      createdAt: (data.createdAt as Timestamp).toDate(),
      updatedAt: (data.updatedAt as Timestamp).toDate(),
      title: data.title,
      userId: data.userId,
      visibility: (data.visibility || 'private') as VisibilityType,
      isPinned: data.isPinned || false,
      customTitle: data.customTitle || null,
    } as Chat;
  } catch (error) {
    console.error('Failed to get chat by id from Firestore');
    throw error;
  }
}

export async function saveMessages({
  messages,
}: {
  messages: Array<DBMessage>;
}) {
  try {
    const results = [];
    for (const msg of messages) {
      try {
        const parts = msg.parts || [{ type: 'text', text: '' }];
        const serializedParts = JSON.parse(JSON.stringify(parts));
        
        const messageData: any = {
          chatId: msg.chatId,
          role: msg.role,
          parts: serializedParts,
          attachments: Array.isArray(msg.attachments) ? msg.attachments : [],
          processed: msg.processed || false,
          createdAt: Timestamp.fromDate(msg.createdAt || new Date()),
        };
        
        if (msg.agentType) messageData.agentType = msg.agentType;
        if (msg.useCaseId) messageData.useCaseId = msg.useCaseId;
        if (msg.modelId) messageData.modelId = msg.modelId;
        if (msg.inputTokens) messageData.inputTokens = msg.inputTokens;
        if (msg.outputTokens) messageData.outputTokens = msg.outputTokens;
        
        const messageRef = adminDb.collection('chats').doc(msg.chatId).collection('messages').doc(msg.id);
        await messageRef.set(messageData);
        
        const chatRef = adminDb.collection('chats').doc(msg.chatId);
        await chatRef.update({
          updatedAt: FieldValue.serverTimestamp(),
        });
        
        results.push(msg.id);
      } catch (err) {
        console.error(`Failed to save message ${msg.id}`, err);
      }
    }
    return results;
  } catch (error) {
    console.error('Failed to save messages to Firestore');
    throw error;
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    const querySnapshot = await adminDb
      .collection('chats')
      .doc(id)
      .collection('messages')
      .orderBy('createdAt', 'asc')
      .get();
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        chatId: data.chatId,
        role: data.role,
        parts: data.parts,
        attachments: data.attachments,
        createdAt: (data.createdAt as Timestamp).toDate(),
        agentType: data.agentType || null,
        useCaseId: data.useCaseId || null,
        modelId: data.modelId || null,
        inputTokens: data.inputTokens || 0,
        outputTokens: data.outputTokens || 0,
        processed: data.processed || false,
      };
    });
  } catch (error) {
    console.error('Failed to get messages by chat id from Firestore');
    throw error;
  }
}

export async function getPaginatedMessagesByChatId(
  chatId: string,
  limit = 50,
  offset = 0
) {
  try {
    const querySnapshot = await adminDb
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .get();
    
    const paginatedMessages = querySnapshot.docs
      .slice(offset, offset + limit)
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          chatId: data.chatId,
          role: data.role,
          parts: data.parts,
          attachments: data.attachments,
          createdAt: (data.createdAt as Timestamp).toDate(),
          agentType: data.agentType || null,
          useCaseId: data.useCaseId || null,
          modelId: data.modelId || null,
        };
      });
    
    return paginatedMessages;
  } catch (error) {
    console.error('Failed to get paginated messages from Firestore');
    throw error;
  }
}

export async function getMessageById({ id }: { id: string }): Promise<DBMessage | null> {
  try {
    // Search across all chats for this message (inefficient but works for now)
    const chatsSnapshot = await adminDb.collection('chats').get();
    
    for (const chatDoc of chatsSnapshot.docs) {
      const messageDoc = await chatDoc.ref.collection('messages').doc(id).get();
      if (messageDoc.exists) {
        const data = messageDoc.data()!;
        return {
          id: messageDoc.id,
          chatId: data.chatId,
          role: data.role,
          parts: data.parts,
          attachments: data.attachments || [],
          createdAt: (data.createdAt as Timestamp).toDate(),
          agentType: data.agentType || undefined,
          useCaseId: data.useCaseId || null,
          modelId: data.modelId || undefined,
          inputTokens: data.inputTokens || 0,
          outputTokens: data.outputTokens || 0,
          processed: data.processed || false,
        } as DBMessage;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get message by id from Firestore');
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
    const querySnapshot = await adminDb
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .where('createdAt', '>', Timestamp.fromDate(timestamp))
      .get();
    
    const deletePromises = querySnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(deletePromises);
    
    return querySnapshot.docs.length;
  } catch (error) {
    console.error('Failed to delete messages from Firestore');
    throw error;
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: string;
}) {
  try {
    const chatRef = adminDb.collection('chats').doc(chatId);
    await chatRef.update({ visibility, updatedAt: FieldValue.serverTimestamp() });
    return null;
  } catch (error) {
    console.error('Failed to update chat visibility in Firestore');
    throw error;
  }
}

export async function updateChatTitle({
  chatId,
  title,
  customTitle,
}: {
  chatId: string;
  title?: string;
  customTitle?: string;
}) {
  try {
    const chatRef = adminDb.collection('chats').doc(chatId);
    const updates: any = { updatedAt: FieldValue.serverTimestamp() };
    if (title) updates.title = title;
    if (customTitle) updates.customTitle = customTitle;
    
    await chatRef.update(updates);
    return null;
  } catch (error) {
    console.error('Failed to update chat title in Firestore');
    throw error;
  }
}

export async function updateChat({
  id,
  modelId,
}: {
  id: string;
  modelId?: string;
}) {
  try {
    const chatRef = adminDb.collection('chats').doc(id);
    const updates: any = { updatedAt: FieldValue.serverTimestamp() };
    if (modelId) updates.modelId = modelId;
    
    await chatRef.update(updates);
    return null;
  } catch (error) {
    console.error('Failed to update chat in Firestore');
    throw error;
  }
}

export async function toggleChatPinned({
  chatId,
}: {
  chatId: string;
}) {
  try {
    const chatDoc = await adminDb.collection('chats').doc(chatId).get();
    if (!chatDoc.exists) throw new Error('Chat not found');
    
    const data = chatDoc.data()!;
    await adminDb.collection('chats').doc(chatId).update({
      isPinned: !data.isPinned,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return null;
  } catch (error) {
    console.error('Failed to toggle chat pinned in Firestore');
    throw error;
  }
}

export async function searchChatsByTitle({
  userId,
  query,
}: {
  userId: string;
  query: string;
}) {
  try {
    const querySnapshot = await adminDb
      .collection('chats')
      .where('userId', '==', userId)
      .orderBy('updatedAt', 'desc')
      .limit(100)
      .get();
    
    const filtered = querySnapshot.docs
      .filter(doc => {
        const data = doc.data();
        return (
          data.title.toLowerCase().includes(query.toLowerCase()) ||
          (data.customTitle?.toLowerCase().includes(query.toLowerCase()))
        );
      })
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          title: data.title,
          customTitle: data.customTitle || null,
          visibility: data.visibility,
          isPinned: data.isPinned,
          createdAt: (data.createdAt as Timestamp).toDate(),
          updatedAt: (data.updatedAt as Timestamp).toDate(),
        };
      });
    
    return filtered;
  } catch (error) {
    console.error('Failed to search chats from Firestore');
    throw error;
  }
}

export async function withinContext(chatId: string, maxTokens = 150000): Promise<{
  messageIds: string[];
  totalTokens: number;
}> {
  try {
    const querySnapshot = await adminDb
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .orderBy('createdAt', 'asc')
      .get();
    
    const messages = querySnapshot.docs.map(doc => doc.data());
    const messageIds: string[] = [];
    let totalTokens = 0;
    
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const estimatedTokens = JSON.stringify(msg).length / 4;
      
      if (totalTokens + estimatedTokens > maxTokens) break;
      
      messageIds.unshift(querySnapshot.docs[i].id);
      totalTokens += estimatedTokens;
    }
    
    return { messageIds, totalTokens };
  } catch (error) {
    console.error('Failed to check context in Firestore');
    throw error;
  }
}

export async function getAttachmentsFromDb(chatId: string) {
  try {
    const querySnapshot = await adminDb
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .get();
    
    const attachments: any[] = [];
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.attachments && Array.isArray(data.attachments)) {
        attachments.push(...data.attachments);
      }
    });
    
    return attachments;
  } catch (error) {
    console.error('Failed to get attachments from Firestore');
    throw error;
  }
}

export async function getDocumentsByChatId({ chatId }: { chatId: string }) {
  try {
    // Assuming documents are stored as subcollection in chats
    const querySnapshot = await adminDb
      .collection('chats')
      .doc(chatId)
      .collection('documents')
      .get();
    
    return querySnapshot.docs.map(doc => doc.data()) || [];
  } catch (error) {
    console.error('Failed to get documents by chat id from Firestore');
    return [];
  }
}

export async function getSystemPromptByAssistantId(assistantId: string): Promise<string | null> {
  try {
    const docSnapshot = await adminDb.collection('systemPrompts').doc(assistantId).get();
    
    if (!docSnapshot.exists) return null;
    
    const data = docSnapshot.data();
    return data?.prompt || null;
  } catch (error) {
    console.error('Failed to get system prompt from Firestore');
    return null;
  }
}

export async function saveSystemPrompt(assistantId: string, prompt: string) {
  try {
    await adminDb.collection('systemPrompts').doc(assistantId).set({
      prompt,
      updatedAt: Timestamp.now(),
    });
    return null;
  } catch (error) {
    console.error('Failed to save system prompt to Firestore');
    throw error;
  }
}

export interface Document {
  id: string;
  title: string;
  content: string;
  kind?: string;
  userId?: string;
  chatId?: string;
  author?: 'user' | 'ai';
  version: number;
  isWorkingVersion: boolean;
  forkedFromVersion?: number;
  createdAt: Date;
  updatedAt: Date;
}

export async function saveDocument(doc: Partial<Document> & { id: string }): Promise<void> {
  try {
    const { version, ...docData } = doc;
    
    if (version) {
      const parentDocId = doc.id.split('-v')[0];
      const versionId = `v${version}`;
      
      await adminDb.collection('documents').doc(parentDocId).collection('versions').doc(versionId).set({
        ...docData,
        version,
        updatedAt: Timestamp.now(),
      }, { merge: true });
      
      await adminDb.collection('documents').doc(parentDocId).set({
        title: doc.title,
        kind: doc.kind,
        updatedAt: Timestamp.now(),
      }, { merge: true });
    } else {
      await adminDb.collection('documents').doc(doc.id).set({
        ...docData,
        updatedAt: Timestamp.now(),
      }, { merge: true });
    }
  } catch (error) {
    console.error('Failed to save document to Firestore');
    throw error;
  }
}

export async function getDocumentsById({ id }: { id: string }): Promise<Document[]> {
  try {
    const versionsSnapshot = await adminDb.collection('documents').doc(id).collection('versions').orderBy('version').get();
    
    if (versionsSnapshot.empty) {
      const docSnapshot = await adminDb.collection('documents').doc(id).get();
      if (!docSnapshot.exists) return [];
      const data = docSnapshot.data();
      return [{
        id: docSnapshot.id,
        title: data?.title || '',
        content: data?.content || '',
        kind: data?.kind,
        userId: data?.userId,
        chatId: data?.chatId,
        author: data?.author as 'user' | 'ai' | undefined,
        version: 1,
        isWorkingVersion: true,
        createdAt: (data?.createdAt as Timestamp)?.toDate() || new Date(),
        updatedAt: (data?.updatedAt as Timestamp)?.toDate() || new Date(),
      }];
    }
    
    return versionsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: data.id || doc.ref.parent.parent?.id || '',
        title: data.title || '',
        content: data.content || '',
        kind: data.kind,
        userId: data.userId,
        chatId: data.chatId,
        author: data.author as 'user' | 'ai' | undefined,
        version: data.version || 1,
        isWorkingVersion: data.isWorkingVersion || false,
        forkedFromVersion: data.forkedFromVersion,
        createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
        updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date(),
      };
    });
  } catch (error) {
    console.error('Failed to get documents from Firestore');
    return [];
  }
}

export async function getDocumentById({ id }: { id: string }): Promise<Document | null> {
  const docs = await getDocumentsById({ id });
  return docs.length > 0 ? docs[0] : null;
}

export function getWorkingVersion(): string {
  return '';
}

export async function saveSuggestions(data: { suggestions: any[]; userId?: string }): Promise<void> {
  // Stub function for suggestions
}

export interface Suggestion {
  id: string;
  content?: string;
  description?: string;
  originalText: string;
}

export async function getSuggestions(): Promise<Suggestion[]> {
  return [];
}
