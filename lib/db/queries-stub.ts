// Temporary stub file to disable database operations
// All database functions are disabled and replaced with console logs

export async function getChatById({ id }: { id: string }) {
  console.log('Database operation disabled - getChatById:', id);
  return null; // Always return null (no chat found)
}

export async function saveChat({ id, userId, title }: { id: string; userId: string; title: string }) {
  console.log('Database operation disabled - saveChat:', { id, userId, title });
  return true; // Simulate success
}

export async function saveMessages({ messages }: { messages: any[] }) {
  console.log('Database operation disabled - saveMessages:', messages.length, 'messages');
  return true; // Simulate success
}

export async function updateChatVisiblityById(args: any) {
  console.log('Database operation disabled - updateChatVisiblityById:', args);
  return true;
}

export async function getMessageById(args: any) {
  console.log('Database operation disabled - getMessageById:', args);
  return null;
}

export async function deleteMessagesByChatIdAfterTimestamp(args: any) {
  console.log('Database operation disabled - deleteMessagesByChatIdAfterTimestamp:', args);
  return true;
}

export async function getVotesByChatId(args: any) {
  console.log('Database operation disabled - getVotesByChatId:', args);
  return []; // Return empty votes array
}

export async function voteMessage(args: any) {
  console.log('Database operation disabled - voteMessage:', args);
  return true;
}

export async function executeCsvQuery(args: any) {
  console.log('Database operation disabled - executeCsvQuery:', args);
  return { results: [], columns: [] }; // Return empty CSV results
}

export async function listCsvTables(args: any) {
  console.log('Database operation disabled - listCsvTables:', args);
  return []; // Return empty tables list
}