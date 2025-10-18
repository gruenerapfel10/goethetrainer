import 'server-only';

import { adminDb } from './admin';
import {
  Timestamp,
  FieldValue,
} from 'firebase-admin/firestore';

// Type definitions matching PostgreSQL schema
export interface FirestoreUser {
  id: string;
  email: string;
  password?: string;
  isAdmin: boolean;
  createdAt: Timestamp;
}

export interface FirestoreChat {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  title: string;
  userId: string;
  visibility: 'public' | 'private';
  isPinned: boolean;
  customTitle?: string;
}

export interface FirestoreMessage {
  id: string;
  chatId: string;
  role: string;
  parts: any[];
  attachments: any[];
  createdAt: Timestamp;
  agentType?: string;
  useCaseId?: string;
  modelId?: string;
  inputTokens?: number;
  outputTokens?: number;
  processed: boolean;
}

export interface FirestoreVote {
  id: string;
  chatId: string;
  messageId: string;
  isUpvoted: boolean;
  userId: string;
  createdAt: Timestamp;
}

// Helper function to convert Firestore timestamp to Date
function timestampToDate(timestamp: Timestamp): Date {
  return timestamp.toDate();
}

// Helper function to convert Date to Firestore timestamp
function dateToTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

// User functions
export async function createUser(userData: Omit<FirestoreUser, 'id' | 'createdAt'>): Promise<string> {
  const userRef = adminDb.collection('users').doc();
  const userId = userRef.id;
  
  await userRef.set({
    ...userData,
    createdAt: FieldValue.serverTimestamp(),
  });
  
  return userId;
}

export async function getUserById(id: string): Promise<FirestoreUser | null> {
  const userDoc = await adminDb.collection('users').doc(id).get();
  if (!userDoc.exists) return null;
  
  const data = userDoc.data();
  return {
    id: userDoc.id,
    ...data,
    createdAt: data!.createdAt as Timestamp,
  } as FirestoreUser;
}

export async function getUserByEmail(email: string): Promise<FirestoreUser | null> {
  const normalizedEmail = email.toLowerCase().trim();
  const querySnapshot = await adminDb.collection('users').where('email', '==', normalizedEmail).get();
  
  if (querySnapshot.empty) return null;
  
  const userDoc = querySnapshot.docs[0];
  const data = userDoc.data();
  return {
    id: userDoc.id,
    ...data,
    createdAt: data.createdAt as Timestamp,
  } as FirestoreUser;
}

export async function getAllUsers(): Promise<FirestoreUser[]> {
  const querySnapshot = await adminDb.collection('users').get();
  
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt as Timestamp,
    } as FirestoreUser;
  });
}

export async function updateUser(
  userId: string,
  updates: Partial<Omit<FirestoreUser, 'id' | 'createdAt'>>
): Promise<void> {
  await adminDb.collection('users').doc(userId).update({
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

export async function updateUserAdmin(
  userId: string,
  isAdmin: boolean
): Promise<void> {
  await adminDb.collection('users').doc(userId).update({
    isAdmin,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteUserById(userId: string): Promise<void> {
  await adminDb.collection('users').doc(userId).delete();
}

// Chat functions
export async function saveChat(chatData: {
  id: string;
  userId: string;
  title: string;
}): Promise<void> {
  const now = new Date();
  const chatRef = adminDb.collection('chats').doc(chatData.id);
  
  await chatRef.set({
    ...chatData,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
    visibility: 'private',
    isPinned: false,
  });
}

export async function getChatById(id: string): Promise<FirestoreChat | null> {
  const chatDoc = await adminDb.collection('chats').doc(id).get();
  if (!chatDoc.exists) return null;
  
  const data = chatDoc.data();
  return {
    id: chatDoc.id,
    ...data,
    createdAt: data!.createdAt as Timestamp,
    updatedAt: data!.updatedAt as Timestamp,
  } as FirestoreChat;
}

export async function getChatsByUserId(
  userId: string,
  limitCount: number = 50
): Promise<FirestoreChat[]> {
  // First get pinned chats
  const pinnedQuery = adminDb
    .collection('chats')
    .where('userId', '==', userId)
    .where('isPinned', '==', true)
    .orderBy('updatedAt', 'desc')
    .limit(limitCount);
  
  // Then get unpinned chats
  const unpinnedQuery = adminDb
    .collection('chats')
    .where('userId', '==', userId)
    .where('isPinned', '==', false)
    .orderBy('updatedAt', 'desc')
    .limit(limitCount);
  
  const [pinnedSnapshot, unpinnedSnapshot] = await Promise.all([
    pinnedQuery.get(),
    unpinnedQuery.get()
  ]);
  
  const pinnedChats = pinnedSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt as Timestamp,
      updatedAt: data.updatedAt as Timestamp,
    } as FirestoreChat;
  });
  
  const unpinnedChats = unpinnedSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt as Timestamp,
      updatedAt: data.updatedAt as Timestamp,
    } as FirestoreChat;
  });
  
  // Combine pinned first, then unpinned, limited to the requested count
  return [...pinnedChats, ...unpinnedChats].slice(0, limitCount);
}

export async function updateChatTitle(chatId: string, title: string): Promise<void> {
  const chatRef = adminDb.collection('chats').doc(chatId);
  await chatRef.update({
    title,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function updateChatVisibility(
  chatId: string,
  visibility: 'public' | 'private'
): Promise<void> {
  const chatRef = adminDb.collection('chats').doc(chatId);
  await chatRef.update({
    visibility,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function deleteChatById(id: string): Promise<void> {
  // Delete messages first
  const messagesSnapshot = await adminDb.collection('chats').doc(id).collection('messages').get();
  
  const deletePromises = messagesSnapshot.docs.map(messageDoc =>
    messageDoc.ref.delete()
  );
  await Promise.all(deletePromises);
  
  // Delete votes
  const votesSnapshot = await adminDb.collection('chats').doc(id).collection('votes').get();
  
  const deleteVotePromises = votesSnapshot.docs.map(voteDoc =>
    voteDoc.ref.delete()
  );
  await Promise.all(deleteVotePromises);
  
  // Delete the chat
  await adminDb.collection('chats').doc(id).delete();
}

// Message functions
export async function saveMessage(messageData: Omit<FirestoreMessage, 'id' | 'createdAt'>): Promise<string> {
  const messageRef = adminDb.collection('chats').doc(messageData.chatId).collection('messages').doc();
  
  await messageRef.set({
    ...messageData,
    createdAt: Timestamp.fromDate(new Date()),
    processed: messageData.processed || false,
  });
  
  // Update chat updatedAt
  const chatRef = adminDb.collection('chats').doc(messageData.chatId);
  await chatRef.update({
    updatedAt: FieldValue.serverTimestamp(),
  });
  
  return messageRef.id;
}

export async function getMessagesByChatId(chatId: string): Promise<FirestoreMessage[]> {
  const querySnapshot = await adminDb
    .collection('chats')
    .doc(chatId)
    .collection('messages')
    .orderBy('createdAt', 'asc')
    .get();
  
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt as Timestamp,
    } as FirestoreMessage;
  });
}

export async function deleteMessagesByChatIdAfterTimestamp(
  chatId: string,
  timestamp: Date
): Promise<void> {
  const querySnapshot = await adminDb
    .collection('chats')
    .doc(chatId)
    .collection('messages')
    .where('createdAt', '>', Timestamp.fromDate(timestamp))
    .get();
  
  const deletePromises = querySnapshot.docs.map(doc => doc.ref.delete());
  await Promise.all(deletePromises);
}

// Vote functions
export async function saveVote(voteData: Omit<FirestoreVote, 'id' | 'createdAt'>): Promise<void> {
  const voteRef = adminDb.collection('chats').doc(voteData.chatId).collection('votes').doc();
  
  await voteRef.set({
    ...voteData,
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function getVotesByChatId(chatId: string): Promise<FirestoreVote[]> {
  const querySnapshot = await adminDb.collection('chats').doc(chatId).collection('votes').get();
  
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt as Timestamp,
    } as FirestoreVote;
  });
}

// Search functions
export async function searchChatsByTitle(
  userId: string,
  searchQuery: string,
  limitCount: number = 10
): Promise<FirestoreChat[]> {
  // Firestore doesn't support full-text search natively
  // This is a basic implementation that searches for chats containing the query
  const querySnapshot = await adminDb
    .collection('chats')
    .where('userId', '==', userId)
    .orderBy('updatedAt', 'desc')
    .limit(limitCount * 3) // Get more to filter
    .get();
  
  const allChats = querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt as Timestamp,
      updatedAt: data.updatedAt as Timestamp,
    } as FirestoreChat;
  });
  
  // Filter by title containing search query
  return allChats
    .filter(chat => 
      chat.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .slice(0, limitCount);
}

// Migration helper function
export async function migrateFromPostgreSQL(pgData: any): Promise<void> {
  // This function would handle migrating data from PostgreSQL to Firestore
  // Implementation would depend on the specific migration strategy
  console.log('Migration function placeholder - implement based on your needs');
}