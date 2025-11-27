import 'server-only';

import { genSaltSync, hashSync } from 'bcrypt-ts';
import { createSupabaseServiceClient } from '@/lib/supabase/clients';
import type { PostgrestSingleResponse } from '@supabase/supabase-js';
import { myProvider } from '@/lib/ai/models';

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
  modelId?: string | null;
}

export interface DBMessage {
  id: string;
  chatId: string;
  userId?: string | null;
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

function mapProfile(row: any): User {
  return {
    id: row.id,
    email: row.email,
    password: row.password ?? null,
    isAdmin: row.is_admin ?? false,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
  };
}

export async function getUser(email: string): Promise<Array<User>> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('email', email.trim().toLowerCase())
    .limit(1);
  if (error) throw error;
  return data?.map(mapProfile) ?? [];
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('email', email.trim().toLowerCase())
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data ? mapProfile(data) : null;
}

export async function createUser(emailOrData: string | { email: string; isAdmin?: boolean }, password?: string) {
  const supabase = createSupabaseServiceClient();
  const email = (typeof emailOrData === 'string' ? emailOrData : emailOrData.email).toLowerCase().trim();
  const isAdmin = typeof emailOrData === 'object' ? emailOrData.isAdmin ?? false : false;

  // Create Supabase Auth user
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { is_admin: isAdmin },
    user_metadata: { is_admin: isAdmin },
  });
  if (error) throw error;
  const userId = data.user?.id ?? crypto.randomUUID();

  // Hash password for local profile record
  const hashedPassword = password ? hashSync(password, genSaltSync(10)) : null;

  const { error: upsertError } = await supabase.from('profiles').upsert({
    id: userId,
    email,
    is_admin: isAdmin,
    password: hashedPassword,
  });
  if (upsertError) throw upsertError;
  return [];
}

export async function saveChat({
  id,
  userId,
  title,
  modelId,
}: {
  id: string;
  userId: string;
  title: string;
  modelId?: string;
}) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from('chats').insert({
    id,
    user_id: userId,
    title,
    model_id: modelId ?? null,
  });
  if (error) throw error;
  return [{ id }];
}

export async function deleteChatById({ id }: { id: string }) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from('chats').delete().eq('id', id);
  if (error) throw error;
  return { id };
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
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('reading_list')
    .insert({ id: crypto.randomUUID(), user_id: userId, text, translation })
    .select()
    .single();
  if (error) throw error;
  return {
    id: data.id,
    userId,
    text: data.text,
    translation: data.translation,
    createdAt: new Date(data.created_at),
  };
}

export async function updateReadingListEntry({
  userId,
  entryId,
  text,
  translation,
}: {
  userId: string;
  entryId: string;
  text: string;
  translation: string;
}): Promise<ReadingListEntry | null> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('reading_list')
    .update({ text, translation })
    .eq('id', entryId)
    .eq('user_id', userId)
    .select()
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;
  return {
    id: data.id,
    userId,
    text: data.text,
    translation: data.translation,
    createdAt: new Date(data.created_at),
  };
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
  const supabase = createSupabaseServiceClient();
  let query = supabase
    .from('reading_list')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }
  if (search) {
    query = query.or(`text.ilike.%${search}%,translation.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  const hasMore = data.length > limit;
  const items = data.slice(0, limit).map(entry => ({
    id: entry.id,
    userId,
    text: entry.text,
    translation: entry.translation,
    createdAt: new Date(entry.created_at),
  }));

  const nextCursor = hasMore ? data[limit - 1]?.created_at : null;
  return { items, nextCursor };
}

export async function deleteReadingListEntry({
  userId,
  entryId,
}: {
  userId: string;
  entryId: string;
}): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from('reading_list')
    .delete()
    .eq('id', entryId)
    .eq('user_id', userId);
  if (error) throw error;
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
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq('user_id', id)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return (data || []).map(doc => ({
    id: doc.id,
    userId: doc.user_id,
    title: doc.title,
    customTitle: doc.custom_title || null,
    visibility: (doc.visibility || 'private') as VisibilityType,
    isPinned: doc.is_pinned || false,
    createdAt: new Date(doc.created_at),
    updatedAt: new Date(doc.updated_at),
  })) as Chat[];
}

export async function getChatById({ id }: { id: string }): Promise<Chat | null> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from('chats').select('*').eq('id', id).single();
  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;
  return {
    id: data.id,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    title: data.title,
    userId: data.user_id,
    visibility: (data.visibility || 'private') as VisibilityType,
    isPinned: data.is_pinned || false,
    customTitle: data.custom_title || null,
    modelId: data.model_id || null,
  };
}

export async function saveMessages({
  messages,
}: {
  messages: Array<DBMessage>;
}) {
  const supabase = createSupabaseServiceClient();
  const payload = messages.map(msg => ({
    id: msg.id,
    chat_id: msg.chatId,
    user_id: msg.userId ?? null,
    role: msg.role,
    parts: msg.parts ?? [{ type: 'text', text: '' }],
    attachments: Array.isArray(msg.attachments) ? msg.attachments : [],
    processed: msg.processed || false,
    created_at: msg.createdAt || new Date(),
    agent_type: msg.agentType || null,
    model_id: msg.modelId || null,
    input_tokens: msg.inputTokens || 0,
    output_tokens: msg.outputTokens || 0,
  }));

  const { error } = await supabase.from('messages').upsert(payload);
  if (error) throw error;

  const { error: chatUpdateError } = await supabase
    .from('chats')
    .update({ updated_at: new Date() })
    .in(
      'id',
      messages.map(m => m.chatId),
    );
  if (chatUpdateError) throw chatUpdateError;

  return messages.map(m => m.id);
}

export async function getMessagesByChatId({ id }: { id: string }) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', id)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(doc => ({
    id: doc.id,
    chatId: doc.chat_id,
    role: doc.role,
    parts: doc.parts,
    attachments: doc.attachments,
    createdAt: new Date(doc.created_at),
    agentType: doc.agent_type || null,
    useCaseId: doc.use_case_id || null,
    modelId: doc.model_id || null,
    inputTokens: doc.input_tokens || 0,
    outputTokens: doc.output_tokens || 0,
    processed: doc.processed || false,
  }));
}

export async function getPaginatedMessagesByChatId(
  chatId: string,
  limit = 50,
  offset = 0
) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return (data || []).map(doc => ({
    id: doc.id,
    chatId: doc.chat_id,
    role: doc.role,
    parts: doc.parts,
    attachments: doc.attachments,
    createdAt: new Date(doc.created_at),
    agentType: doc.agent_type || null,
    useCaseId: doc.use_case_id || null,
    modelId: doc.model_id || null,
  }));
}

export async function getMessageById({ id }: { id: string }): Promise<DBMessage | null> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from('messages').select('*').eq('id', id).single();
  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;
  return {
    id: data.id,
    chatId: data.chat_id,
    role: data.role,
    parts: data.parts,
    attachments: data.attachments || [],
    createdAt: new Date(data.created_at),
    agentType: data.agent_type || undefined,
    useCaseId: data.use_case_id || null,
    modelId: data.model_id || undefined,
    inputTokens: data.input_tokens || 0,
    outputTokens: data.output_tokens || 0,
    processed: data.processed || false,
  } as DBMessage;
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('chat_id', chatId)
    .gt('created_at', timestamp.toISOString());
  if (error) throw error;
  return null;
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: string;
}) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from('chats')
    .update({ visibility, updated_at: new Date() })
    .eq('id', chatId);
  if (error) throw error;
  return null;
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
  const supabase = createSupabaseServiceClient();
  const updates: any = { updated_at: new Date() };
  if (title) updates.title = title;
  if (customTitle) updates.custom_title = customTitle;
  const { error } = await supabase.from('chats').update(updates).eq('id', chatId);
  if (error) throw error;
  return null;
}

export async function updateChat({
  id,
  modelId,
}: {
  id: string;
  modelId?: string;
}) {
  const supabase = createSupabaseServiceClient();
  const updates: any = { updated_at: new Date() };
  if (modelId) updates.model_id = modelId;
  const { error } = await supabase.from('chats').update(updates).eq('id', id);
  if (error) throw error;
  return null;
}

export async function toggleChatPinned({
  chatId,
}: {
  chatId: string;
}) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from('chats').select('is_pinned').eq('id', chatId).single();
  if (error) throw error;
  const { error: updateError } = await supabase
    .from('chats')
    .update({ is_pinned: !data.is_pinned, updated_at: new Date() })
    .eq('id', chatId);
  if (updateError) throw updateError;
  return null;
}

export async function searchChatsByTitle({
  userId,
  query,
}: {
  userId: string;
  query: string;
}) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq('user_id', userId)
    .ilike('title', `%${query}%`)
    .order('updated_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data || []).map(doc => ({
    id: doc.id,
    userId: doc.user_id,
    title: doc.title,
    customTitle: doc.custom_title || null,
    visibility: doc.visibility,
    isPinned: doc.is_pinned,
    createdAt: new Date(doc.created_at),
    updatedAt: new Date(doc.updated_at),
  }));
}

export async function withinContext(chatId: string, maxTokens = 150000): Promise<{
  messageIds: string[];
  totalTokens: number;
}> {
  const messages = await getMessagesByChatId({ id: chatId });
  const messageIds: string[] = [];
  let totalTokens = 0;

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const estimatedTokens = JSON.stringify(msg).length / 4;
    if (totalTokens + estimatedTokens > maxTokens) break;
    messageIds.unshift(msg.id);
    totalTokens += estimatedTokens;
  }

  return { messageIds, totalTokens };
}

export async function getAttachmentsFromDb(chatId: string) {
  const messages = await getMessagesByChatId({ id: chatId });
  const attachments: any[] = [];
  messages.forEach(msg => {
    if (msg.attachments && Array.isArray(msg.attachments)) {
      attachments.push(...msg.attachments);
    }
  });
  return attachments;
}

export async function getDocumentsByChatId({ chatId }: { chatId: string }) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('chat_id', chatId);
  if (error) throw error;
  return data || [];
}

export async function getSystemPromptByAssistantId(assistantId: string): Promise<string | null> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('system_prompts')
    .select('prompt')
    .eq('assistant_id', assistantId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data?.prompt || null;
}

export async function saveSystemPrompt(assistantId: string, prompt: string) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from('system_prompts')
    .upsert({ assistant_id: assistantId, prompt, updated_at: new Date() });
  if (error) throw error;
  return null;
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
  const supabase = createSupabaseServiceClient();
  const { version, ...docData } = doc;

  if (version) {
    await supabase.from('document_versions').upsert({
      id: crypto.randomUUID(),
      document_id: doc.id,
      content: doc.content,
      version,
      author: doc.author,
      is_working_version: doc.isWorkingVersion,
      forked_from_version: doc.forkedFromVersion,
    });
    await supabase.from('documents').upsert({
      id: doc.id,
      title: doc.title,
      kind: doc.kind,
      user_id: doc.userId,
      updated_at: new Date(),
    });
  } else {
    await supabase.from('documents').upsert({
      id: doc.id,
      title: doc.title,
      kind: doc.kind,
      user_id: doc.userId,
      updated_at: new Date(),
    });
  }
}

export async function getDocumentsById({ id }: { id: string }): Promise<Document[]> {
  const supabase = createSupabaseServiceClient();

  const { data: versions, error } = await supabase
    .from('document_versions')
    .select('*')
    .eq('document_id', id)
    .order('version');

  if (error) throw error;

  if (!versions || versions.length === 0) {
    const { data: doc } = await supabase.from('documents').select('*').eq('id', id).single();
    if (!doc) return [];
    return [
      {
        id: doc.id,
        title: doc.title || '',
        content: doc.content || '',
        kind: doc.kind,
        userId: doc.user_id,
        chatId: doc.chat_id,
        author: doc.author as 'user' | 'ai' | undefined,
        version: 1,
        isWorkingVersion: true,
        createdAt: doc.created_at ? new Date(doc.created_at) : new Date(),
        updatedAt: doc.updated_at ? new Date(doc.updated_at) : new Date(),
      },
    ];
  }

  return versions.map(doc => ({
    id: doc.document_id,
    title: '',
    content: doc.content || '',
    kind: undefined,
    userId: undefined,
    chatId: undefined,
    author: doc.author as 'user' | 'ai' | undefined,
    version: doc.version || 1,
    isWorkingVersion: doc.is_working_version || false,
    forkedFromVersion: doc.forked_from_version,
    createdAt: doc.created_at ? new Date(doc.created_at) : new Date(),
    updatedAt: doc.created_at ? new Date(doc.created_at) : new Date(),
  }));
}

export async function getDocumentById({ id }: { id: string }): Promise<Document | null> {
  const docs = await getDocumentsById({ id });
  return docs.length > 0 ? docs[0] : null;
}

export function getWorkingVersion(): string {
  return '';
}

export async function saveSuggestions(data: { suggestions: any[]; userId?: string }): Promise<void> {
  console.log('[supabase] saveSuggestions stub', data);
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
