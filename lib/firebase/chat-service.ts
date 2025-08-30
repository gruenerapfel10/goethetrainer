// Stub Firebase chat service for compatibility
export async function getChatById({ id }: { id: string }) {
  // Return null to indicate chat doesn't exist yet
  return null;
}

export async function saveChat({ id, userId, title }: { id: string; userId: string; title: string }) {
  console.log('Stub: saveChat called with:', { id, userId, title });
  // In a real implementation, this would save to Firebase
  return { id, userId, title, createdAt: new Date() };
}

export async function saveMessages({ messages }: { messages: any[] }) {
  console.log('Stub: saveMessages called with', messages.length, 'messages');
  // In a real implementation, this would save messages to Firebase
  return messages;
}