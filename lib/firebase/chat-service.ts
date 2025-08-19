import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export interface Chat {
  id: string;
  userId: string;
  title: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isVisible?: boolean;
  isPinned?: boolean;
}

export interface Message {
  id: string;
  chatId: string;
  role: 'user' | 'assistant';
  parts: any[];
  attachments?: any[];
  createdAt: Timestamp;
  useCaseId?: string | null;
  agentType?: string;
  modelId?: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  processed?: boolean;
}

export interface Vote {
  id: string;
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
  createdAt: Timestamp;
}

// Chat operations
export async function getChatById({ id }: { id: string }): Promise<Chat | null> {
  try {
    const chatDoc = await getDoc(doc(db, 'chats', id));
    if (chatDoc.exists()) {
      return { id: chatDoc.id, ...chatDoc.data() } as Chat;
    }
    return null;
  } catch (error) {
    console.error('Error getting chat:', error);
    return null;
  }
}

export async function saveChat({ id, userId, title }: { id: string; userId: string; title: string }) {
  try {
    const chatRef = doc(db, 'chats', id);
    await setDoc(chatRef, {
      userId,
      title,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isVisible: true,
      isPinned: false,
    });
    return true;
  } catch (error) {
    console.error('Error saving chat:', error);
    return false;
  }
}

export async function updateChatVisiblityById({ chatId, visibility }: { chatId: string; visibility: boolean }) {
  try {
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      isVisible: visibility,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error updating chat visibility:', error);
    return false;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    // Delete chat document
    await deleteDoc(doc(db, 'chats', id));
    
    // Delete all messages in the chat
    const messagesQuery = query(
      collection(db, 'messages'),
      where('chatId', '==', id)
    );
    const messagesSnapshot = await getDocs(messagesQuery);
    
    const deletePromises = messagesSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    return true;
  } catch (error) {
    console.error('Error deleting chat:', error);
    return false;
  }
}

// Message operations
export async function saveMessages({ messages }: { messages: any[] }) {
  try {
    const savePromises = messages.map(async (message) => {
      const messageRef = doc(db, 'messages', message.id);
      await setDoc(messageRef, {
        ...message,
        createdAt: serverTimestamp(),
      });
    });
    
    await Promise.all(savePromises);
    return true;
  } catch (error) {
    console.error('Error saving messages:', error);
    return false;
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    const messageDoc = await getDoc(doc(db, 'messages', id));
    if (messageDoc.exists()) {
      return { id: messageDoc.id, ...messageDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting message:', error);
    return null;
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({ 
  chatId, 
  timestamp 
}: { 
  chatId: string; 
  timestamp: Date 
}) {
  try {
    const messagesQuery = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId),
      where('createdAt', '>=', Timestamp.fromDate(timestamp))
    );
    
    const messagesSnapshot = await getDocs(messagesQuery);
    const deletePromises = messagesSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    return true;
  } catch (error) {
    console.error('Error deleting messages:', error);
    return false;
  }
}

// Vote operations
export async function getVotesByChatId({ chatId }: { chatId: string }) {
  try {
    const votesQuery = query(
      collection(db, 'votes'),
      where('chatId', '==', chatId)
    );
    
    const votesSnapshot = await getDocs(votesQuery);
    return votesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting votes:', error);
    return [];
  }
}

export async function voteMessage({ 
  chatId, 
  messageId, 
  type 
}: { 
  chatId: string; 
  messageId: string; 
  type: 'up' | 'down' 
}) {
  try {
    await addDoc(collection(db, 'votes'), {
      chatId,
      messageId,
      type,
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error voting on message:', error);
    return false;
  }
}

// CSV operations (stubbed for now - these would need separate handling)
export async function executeCsvQuery(args: any) {
  console.log('CSV operation not implemented in Firebase - executeCsvQuery:', args);
  return { results: [], columns: [] };
}

export async function listCsvTables(args: any) {
  console.log('CSV operation not implemented in Firebase - listCsvTables:', args);
  return [];
}