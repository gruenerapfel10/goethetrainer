import {
  BedrockAgentRuntimeClient,
  RetrieveCommand,
  type RetrieveCommandInput,
  type KnowledgeBaseRetrievalResult
} from "@aws-sdk/client-bedrock-agent-runtime";

import {
  BedrockAgentClient,
  ListAgentKnowledgeBasesCommand,
  ListDataSourcesCommand,
  type AgentKnowledgeBaseSummary,
  type DataSourceSummary,
} from "@aws-sdk/client-bedrock-agent";

import { myProvider } from '../ai/models';
import { streamText, type LanguageModelUsage } from 'ai';
import { calculateCost, getModelId } from '../costs';

interface Usage {
  inputTokens?: number;
  outputTokens?: number;
}

interface Reference {
  citationId: number;
  source: string;
  uri: string;
  text: string;
  location: {
    start: number;
    end: number;
  };
}

interface ProcessedResult {
  text: string;
  references: Reference[];
  usage?: Usage;
}

interface RetrieveOptions {
  searchMode?: 'semantic' | 'filename' | 'hybrid';
  fileNames?: string[];
  s3Prefix?: string;
}

export class BedrockClient {
  private runtimeClient: BedrockAgentRuntimeClient;
  private agentClient: BedrockAgentClient;
  private agentId: string;
  private agentAliasId: string;

  constructor() {
    // Check each environment variable individually for better error messages
    if (!process.env.BEDROCK_AGENT_ID) {
      console.error('Missing BEDROCK_AGENT_ID environment variable');
      throw new Error('Missing BEDROCK_AGENT_ID environment variable');
    }
    if (!process.env.BEDROCK_AGENT_ALIAS_ID) {
      console.error('Missing BEDROCK_AGENT_ALIAS_ID environment variable');
      throw new Error('Missing BEDROCK_AGENT_ALIAS_ID environment variable');
    }

    const region = process.env.GENERAL_AWS_REGION || process.env.AWS_REGION;
    if (!region) {
      console.error('Missing AWS region configuration');
      throw new Error('Missing AWS region configuration');
    }

    try {
      this.agentId = process.env.BEDROCK_AGENT_ID;
      this.agentAliasId = process.env.BEDROCK_AGENT_ALIAS_ID;
      
      console.log('Initializing BedrockClient with:', {
        region,
        agentId: this.agentId,
        agentAliasId: this.agentAliasId
      });

      const credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      };

      this.runtimeClient = new BedrockAgentRuntimeClient({
        region,
        credentials
      });

      this.agentClient = new BedrockAgentClient({
        region,
        credentials
      });
    } catch (error) {
      console.error('Failed to initialize BedrockClient:', error);
      throw error;
    }
  }

  private async listKnowledgeBases(): Promise<string[]> {
    try {
      const command = new ListAgentKnowledgeBasesCommand({
        agentId: this.agentId,
        agentVersion: 'DRAFT',
        maxResults: 100 // Adjust this number based on your needs
      });

      const response = await this.agentClient.send(command);
      const knowledgeBaseIds = (response.agentKnowledgeBaseSummaries || [])
        .map((kb: AgentKnowledgeBaseSummary) => kb.knowledgeBaseId)
        .filter((id): id is string => !!id);

      console.log('Found knowledge bases:', knowledgeBaseIds);

      if (knowledgeBaseIds.length === 0) {
        // Fallback to environment variable if no knowledge bases found
        const fallbackId = process.env.SHAREPOINT_KNOWLEDGE_BASE_ID;
        if (fallbackId) {
          console.warn('No knowledge bases found via API, falling back to SHAREPOINT_KNOWLEDGE_BASE_ID');
          return [fallbackId];
        }
        console.warn('No knowledge bases found');
        return [];
      }

      return knowledgeBaseIds;
    } catch (error) {
      console.error('Error listing knowledge bases:', error);
      // Fallback to environment variable on error
      const fallbackId = process.env.SHAREPOINT_KNOWLEDGE_BASE_ID;
      if (fallbackId) {
        console.warn('Failed to list knowledge bases, falling back to SHAREPOINT_KNOWLEDGE_BASE_ID');
        return [fallbackId];
      }
      throw error;
    }
  }

  private async listDataSources(knowledgeBaseId: string): Promise<string[]> {
    try {
      const command = new ListDataSourcesCommand({
        knowledgeBaseId,
        maxResults: 100
      });
      const response = await this.agentClient.send(command);
      const dataSourceIds = (response.dataSourceSummaries || [])
        .map((ds: DataSourceSummary) => ds.dataSourceId)
        .filter((id): id is string => !!id);
      
      console.log(`Found data sources for KB ${knowledgeBaseId}:`, dataSourceIds);
      return dataSourceIds;
    } catch (error) {
      console.error(`Error listing data sources for knowledge base ${knowledgeBaseId}:`, error);
      throw error;
    }
  }
    
  private getLocationFromReference(ref: any): string | null {
    try {
      return ref.location?.s3Location?.uri ||
        ref.location?.sharePointLocation?.url ||
        ref.location?.webLocation?.url ||
        ref.location?.confluenceLocation?.url ||
        ref.location?.kendraDocumentLocation?.uri ||
        null;
    } catch (error) {
      console.error('Error getting location from reference:', error);
      return null;
    }
  }

  private getFilenameFromUri(uri: string): string {
    try {
      if (uri.startsWith('s3://')) {
        return uri.split('/').pop() || 'Document';
      }
      try {
        const url = new URL(uri);
        return url.pathname.split('/').pop() || 'Document';
      } catch {
        return uri.split('/').pop() || 'Document';
      }
    } catch (error) {
      console.error('Error getting filename from URI:', error);
      return 'Document';
    }
  }

  async retrieve(input: string, options?: RetrieveOptions): Promise<KnowledgeBaseRetrievalResult[]> {
    console.log('Retrieving documents for input:', input, 'with options:', options);
    
    try {
      // Get all available knowledge bases
      const knowledgeBaseIds = await this.listKnowledgeBases();
      
      if (knowledgeBaseIds.length === 0) {
        console.warn('No knowledge bases found');
        return [];
      }

      // Query each knowledge base and collect all results
      const allResults: KnowledgeBaseRetrievalResult[] = [];
      
      for (const knowledgeBaseId of knowledgeBaseIds) {
        console.log(`Querying knowledge base: ${knowledgeBaseId}`);
        
        const commandInput: RetrieveCommandInput = {
          knowledgeBaseId,
          retrievalQuery: {
            text: input
          }
        };

        // Add metadata filtering if requested
        if (options && (options.fileNames || options.s3Prefix || options.searchMode === 'filename')) {
          commandInput.retrievalConfiguration = {
            vectorSearchConfiguration: {
              filter: this.buildMetadataFilter(options)
            }
          };
        }

        const command = new RetrieveCommand(commandInput);
        const response = await this.runtimeClient.send(command);
        
        if (response.retrievalResults && response.retrievalResults.length > 0) {
          console.log(`Found ${response.retrievalResults.length} results in knowledge base ${knowledgeBaseId}`);
          allResults.push(...response.retrievalResults);
        }
      }

      // Sort results by score if available
      allResults.sort((a, b) => (b.score || 0) - (a.score || 0));
      
      console.log('Retrieved documents across all knowledge bases:', {
        totalCount: allResults.length,
        knowledgeBasesQueried: knowledgeBaseIds.length
      });

      return allResults;
    } catch (error) {
      console.error('Error retrieving from knowledge bases:', error);
      throw error;
    }
  }

  private buildMetadataFilter(options: RetrieveOptions): any {
    const filters: any[] = [];

    // If searching by specific file names
    if (options.fileNames && options.fileNames.length > 0) {
      if (options.fileNames.length === 1) {
        // For a single file, use stringContains for the filename
        filters.push({
          stringContains: {
            key: 'x-amz-bedrock-kb-source-uri',
            value: options.fileNames[0]
          }
        });
      } else {
        // For multiple files, use OR condition
        filters.push({
          orAll: options.fileNames.map(fileName => ({
            stringContains: {
              key: 'x-amz-bedrock-kb-source-uri',
              value: fileName
            }
          }))
        });
      }
    }

    // If filtering by S3 prefix (folder)
    if (options.s3Prefix) {
      filters.push({
        startsWith: {
          key: 'x-amz-bedrock-kb-source-uri',
          value: options.s3Prefix
        }
      });
    }

    // If we have multiple filters, combine them with AND
    if (filters.length === 0) {
      return undefined;
    } else if (filters.length === 1) {
      return filters[0];
    } else {
      return {
        andAll: filters
      };
    }
  }

  async process(input: string, retrievalResults: KnowledgeBaseRetrievalResult[]): Promise<ProcessedResult> {
    console.log('Processing documents:', {
      input,
      documentCount: retrievalResults.length
    });

    // Use Claude 3.7 Sonnet for processing
    const model = myProvider.languageModel('bedrock-sonnet-latest');
    
    // Format retrieval results for the model
    const formattedResults = retrievalResults.map(result => ({
      content: result.content?.text || '',
      source: this.getFilenameFromUri(
        this.getLocationFromReference(result) || 'unknown'
      ),
      score: result.score || 0
    }));

    // Create prompt for Claude 3.7
    const prompt = `Given the following retrieved documents and the user's query, provide a comprehensive response.
    
User Query: ${input}

Retrieved Documents:
${formattedResults.map((doc, i) => `
[${i + 1}] Source: ${doc.source}
Relevance Score: ${doc.score}
Content: ${doc.content}
`).join('\n')}

Please analyze these documents and provide a response that:
1. Directly answers the user's query
2. Cites sources using [1], [2], etc.
3. Synthesizes information across documents when relevant
4. Maintains factual accuracy
5. Acknowledges any limitations in the available information`;

    try {
      let accumulatedText = '';
      let modelUsage: LanguageModelUsage | undefined;

      console.log('Starting text stream processing');

      const result = streamText({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        experimental_telemetry: { isEnabled: true },
        onChunk: (event: any) => {
          if (event.chunk.type === 'text-delta') {
            accumulatedText += event.chunk.textDelta;
          }
        },
        onFinish: (response: any) => {
          modelUsage = response.usage;
          console.log('Stream processing finished:', {
            usage: modelUsage
          });
        }
      });

      // Consume the stream
      await result.consumeStream();

      // Process the response to extract citations and create references
      const references = new Map<number, Reference>();
      let citationCounter = 1;

      // Extract citations and build references
      formattedResults.forEach((doc, index) => {
        const citationMarker = `[${index + 1}]`;
        if (accumulatedText.includes(citationMarker)) {
          references.set(citationCounter, {
            citationId: citationCounter,
            source: doc.source,
            uri: this.getLocationFromReference(retrievalResults[index]) || '',
            text: doc.content,
            location: {
              start: accumulatedText.indexOf(citationMarker),
              end: accumulatedText.indexOf(citationMarker) + citationMarker.length
            }
          });
          citationCounter++;
        }
      });

      // Convert model usage to our Usage interface
      const usage: Usage | undefined = modelUsage ? {
        inputTokens: modelUsage.promptTokens,
        outputTokens: modelUsage.completionTokens
      } : undefined;

      // Calculate cost for the document processing
      const modelIdentifier = 'bedrock-sonnet-latest';
      const modelId = getModelId(modelIdentifier);
      let cost: number | null = null;
      
      if (modelUsage && modelId) {
        cost = calculateCost(modelId, modelUsage.promptTokens, modelUsage.completionTokens);
        console.log(`BedrockClient processing cost: $${cost?.toFixed(6) ?? 'N/A'} for ${modelUsage.promptTokens} input + ${modelUsage.completionTokens} output tokens`);
      }

      console.log('Processing complete:', {
        textLength: accumulatedText.length,
        referenceCount: references.size,
        usage,
        cost
      });

      return {
        text: accumulatedText,
        references: Array.from(references.values()),
        usage
      };
    } catch (error) {
      console.error('Error processing with Claude 3.7:', error);
      throw error;
    }
  }

  async invoke({
    input,
    sessionId,
    options,
  }: {
    input: string;
    sessionId: string;
    options?: RetrieveOptions;
  }): Promise<ProcessedResult> {
    try {
      console.log('Starting invoke:', {
        input,
        sessionId,
        options
      });

      // Step 1: Retrieve relevant documents
      const retrievalResults = await this.retrieve(input, options);
      
      // Step 2: Process with Claude 3.7
      return await this.process(input, retrievalResults);
    } catch (error) {
      console.error('Error in invoke:', error);
      throw error;
    }
  }
}