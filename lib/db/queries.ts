// Re-export everything from Firebase chat service for compatibility
export {
  saveMessages,
  getMessageById,
  getChatById,
  saveChat,
  updateChatVisiblityById,
  deleteMessagesByChatIdAfterTimestamp,
  getVotesByChatId,
  voteMessage,
  deleteChatById,
  executeCsvQuery,
  listCsvTables,
} from '@/lib/firebase/chat-service';

// Stub implementations for features not needed in Kingfisher
export async function getMessagesByChatId(args: any) {
  console.log('getMessagesByChatId stub:', args);
  return [];
}

export async function updateChatTitle(args: any) {
  console.log('updateChatTitle stub:', args);
  return null;
}

export async function getChatsByUserId(args: any) {
  console.log('getChatsByUserId stub:', args);
  return [];
}

export async function pinChatById(args: any) {
  console.log('pinChatById stub:', args);
  return null;
}

export async function createSuggestions(args: any) {
  console.log('createSuggestions stub:', args);
  return null;
}

export async function getSuggestionsByMessageId(args: any) {
  console.log('getSuggestionsByMessageId stub:', args);
  return [];
}

export async function updateUser(args: any) {
  console.log('updateUser stub:', args);
  return null;
}

export async function suggestDegrees(args: any) {
  console.log('suggestDegrees stub:', args);
  return [];
}

export async function suggestDegreesByQuery(args: any) {
  console.log('suggestDegreesByQuery stub:', args);
  return [];
}

export async function searchDegreesByName(args: any) {
  console.log('searchDegreesByName stub:', args);
  return [];
}

export async function getUniversitiesForDegree(args: any) {
  console.log('getUniversitiesForDegree stub:', args);
  return [];
}

export async function getUniversityById(args: any) {
  console.log('getUniversityById stub:', args);
  return null;
}

export async function getUserByEmail(email: string) {
  console.log('getUserByEmail stub:', email);
  return null;
}

export async function getUserById(id: string) {
  console.log('getUserById stub:', id);
  return null;
}

export async function createUser(data: any) {
  console.log('createUser stub:', data);
  return null;
}

export async function getUser(email: string) {
  console.log('getUser stub:', email);
  return null;
}

export async function deleteUser(args: any) {
  console.log('deleteUser stub:', args);
  return null;
}

export async function getDocument(args: any) {
  console.log('getDocument stub:', args);
  return null;
}

export async function getDocumentById(args: any) {
  console.log('getDocumentById stub:', args);
  return null;
}

export async function saveDocument(args: any) {
  console.log('saveDocument stub:', args);
  return { id: 'stub-doc-id' };
}

export async function saveSuggestions(args: any) {
  console.log('saveSuggestions stub:', args);
  return null;
}

export async function deleteDocumentById(args: any) {
  console.log('deleteDocumentById stub:', args);
  return null;
}

export async function getSuggestionsByDocumentId(args: any) {
  console.log('getSuggestionsByDocumentId stub:', args);
  return [];
}

export async function getChatsWithDetails(args: any) {
  console.log('getChatsWithDetails stub:', args);
  return [];
}

export async function getUseCasesWithCategories(args: any) {
  console.log('getUseCasesWithCategories stub:', args);
  return [];
}

export async function getUseCaseCategories(args: any) {
  console.log('getUseCaseCategories stub:', args);
  return { categories: [], totalPages: 0, totalCategories: 0 };
}

export async function getUseCasesByCategory(args: any) {
  console.log('getUseCasesByCategory stub:', args);
  return { useCases: [], totalPages: 0, totalUseCases: 0 };
}

export async function getTotalTimeSaved(args: any) {
  console.log('getTotalTimeSaved stub:', args);
  return 0;
}

export async function getUseCaseAnalytics(args: any) {
  console.log('getUseCaseAnalytics stub:', args);
  return [];
}

export async function getChatsByUseCaseId(args: any) {
  console.log('getChatsByUseCaseId stub:', args);
  return [];
}

export async function getAllUsers(args: any) {
  console.log('getAllUsers stub:', args);
  return [];
}

export async function updateUserRole(args: any) {
  console.log('updateUserRole stub:', args);
  return null;
}

export async function deleteUserAccount(args: any) {
  console.log('deleteUserAccount stub:', args);
  return null;
}

export async function createSystemOperation(args: any) {
  console.log('createSystemOperation stub:', args);
  return null;
}

export async function updateSystemOperation(args: any) {
  console.log('updateSystemOperation stub:', args);
  return null;
}

export async function getPendingOperations(args: any) {
  console.log('getPendingOperations stub:', args);
  return [];
}

export async function getSystemOperationById(args: any) {
  console.log('getSystemOperationById stub:', args);
  return null;
}

export async function getSystemOperations(args: any) {
  console.log('getSystemOperations stub:', args);
  return [];
}

export async function getLatestOperationByType(args: any) {
  console.log('getLatestOperationByType stub:', args);
  return null;
}

export async function removeLogo(args: any) {
  console.log('removeLogo stub:', args);
  return null;
}

export async function getActiveLogo(args?: any) {
  console.log('getActiveLogo stub:', args);
  return null;
}

export async function getLogosByUserId(args: any) {
  console.log('getLogosByUserId stub:', args);
  return [];
}

export async function saveOrUpdateLogo(args: any) {
  console.log('saveOrUpdateLogo stub:', args);
  return null;
}

export async function getSuggestedMessagesByModelId(args: any) {
  console.log('getSuggestedMessagesByModelId stub:', args);
  return [];
}

export async function saveSuggestedMessage(args: any) {
  console.log('saveSuggestedMessage stub:', args);
  return null;
}

export async function deleteSuggestedMessage(args: any) {
  console.log('deleteSuggestedMessage stub:', args);
  return null;
}

export async function getModelUsageOverTime(args: any) {
  console.log('getModelUsageOverTime stub:', args);
  return [];
}

export async function getAgentTypeUsageOverTime(args: any) {
  console.log('getAgentTypeUsageOverTime stub:', args);
  return [];
}

export async function getMessageCountOverTime(args: any) {
  console.log('getMessageCountOverTime stub:', args);
  return [];
}

export async function getTopUseCases(args: any) {
  console.log('getTopUseCases stub:', args);
  return [];
}

export async function getUseCaseMessages(args: any) {
  console.log('getUseCaseMessages stub:', args);
  return [];
}

// Types that may be referenced
export type User = any;
export type Chat = any;
export type DBMessage = any;
export type Vote = any;
export type Document = any;
export type Suggestion = any;
export type SystemOperation = any;
export type NewSystemOperation = any;