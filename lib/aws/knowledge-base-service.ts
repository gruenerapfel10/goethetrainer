// lib/aws/knowledge-base-service.ts
// Note: This service is disabled due to Gemini migration
// Bedrock knowledge base functionality is no longer available

export class KnowledgeBaseService {
  constructor() {
    console.warn('KnowledgeBaseService is disabled after migration to Gemini');
  }

  async ingestDocuments() {
    throw new Error('Knowledge base ingestion is not available after migration to Gemini');
  }

  async deleteDocuments() {
    throw new Error('Knowledge base deletion is not available after migration to Gemini');
  }

  async getDocuments() {
    throw new Error('Knowledge base document retrieval is not available after migration to Gemini');
  }
}

// Legacy exports for backward compatibility (all disabled)
export async function flagMultipleFilesForDeletion() {
  throw new Error('File deletion flagging is not available after migration to Gemini');
}

export async function flagSingleFileForDeletion() {
  throw new Error('File deletion flagging is not available after migration to Gemini');
}

export async function processPendingBedrockOperations() {
  throw new Error('Bedrock operations are not available after migration to Gemini');
}

export async function syncSharepointToS3AndFlagForBedrock() {
  throw new Error('SharePoint sync is not available after migration to Gemini');
}

export async function uploadAndRegisterManualFiles() {
  throw new Error('Manual file upload is not available after migration to Gemini');
}