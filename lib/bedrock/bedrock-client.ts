import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
  type InvokeAgentCommandInput,
} from "@aws-sdk/client-bedrock-agent-runtime";

interface Usage {
  inputTokens?: number;
  outputTokens?: number;
}

interface InvokeParams {
  input: string;
  sessionId: string;
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

interface InvokeResponse {
  text: string;
  references: Reference[];
  usage?: Usage;
}

export class BedrockAgentClient {
  private client: BedrockAgentRuntimeClient;
  private agentId: string;
  private agentAliasId: string;

  constructor() {
    if (!process.env.BEDROCK_AGENT_ID || !process.env.BEDROCK_AGENT_ALIAS_ID) {
      throw new Error('Missing required environment variables for Bedrock Agent');
    }

    this.agentId = process.env.BEDROCK_AGENT_ID;
    this.agentAliasId = process.env.BEDROCK_AGENT_ALIAS_ID;
    this.client = new BedrockAgentRuntimeClient({
      region: process.env.GENERAL_AWS_REGION || process.env.AWS_REGION || 'eu-central-1',
    });
  }

  private getLocationFromReference(ref: any): string | null {
    return ref.location?.s3Location?.uri ||
      ref.location?.sharePointLocation?.url ||
      ref.location?.webLocation?.url ||
      ref.location?.confluenceLocation?.url ||
      ref.location?.kendraDocumentLocation?.uri ||
      null;
  }

  // Helper function to extract filename from S3 URI or other URIs
  private getFilenameFromUri(uri: string): string {
    if (uri.startsWith('s3://')) {
      // For S3 URIs, get the last part after the last slash
      return uri.split('/').pop() || 'Document';
    }
    // For other URIs, try to extract filename
    try {
      const url = new URL(uri);
      return url.pathname.split('/').pop() || 'Document';
    } catch {
      return uri.split('/').pop() || 'Document';
    }
  }

  async invoke({ input, sessionId }: InvokeParams): Promise<InvokeResponse> {
    const commandInput: InvokeAgentCommandInput = {
      agentId: this.agentId,
      agentAliasId: this.agentAliasId,
      sessionId,
      inputText: input,
      enableTrace: true
    };

    try {
      const command = new InvokeAgentCommand(commandInput);
      let accumulatedText = '';
      const references = new Map<number, Reference>();
      let citationCounter = 1;

      let usage: Usage | undefined;

      const streamResponse = await this.client.send(command);
      if (streamResponse.completion) {
        for await (const event of streamResponse.completion) {
          if (event.chunk?.bytes instanceof Uint8Array) {
            const text = new TextDecoder().decode(event.chunk.bytes);
            accumulatedText += text;

            if (event.chunk.attribution?.citations) {
              event.chunk.attribution.citations.forEach((citation: any) => {
                const { span } = citation.generatedResponsePart.textResponsePart;
                citation.retrievedReferences.forEach((ref: any) => {
                  const uri = this.getLocationFromReference(ref);
                  if (uri) {
                    references.set(citationCounter, {
                      citationId: citationCounter,
                      source: this.getFilenameFromUri(uri), // Use helper function for consistent filename extraction
                      uri, // Store the full URI (S3 URI, SharePoint URL, etc.)
                      text: ref.content?.text || '',
                      location: {
                        start: span.start,
                        end: span.end + 1 // Added +1 to move citation one char deeper
                      }
                    });
                    citationCounter++;
                  }
                });
              });
            }

            if ("metadata" in event &&
              event.metadata &&
              typeof event.metadata === 'object' &&
              "usage" in event.metadata) {
              usage = event.metadata.usage ?? undefined;
            }
          }
        }
      }

      // Add citation markers to text
      let markedText = accumulatedText;
      Array.from(references.values())
      .sort((a, b) => b.location.end - a.location.end)
      .forEach(ref => {
        const { start, end } = ref.location;
        const before = markedText.slice(0, end);
        const after = markedText.slice(end);
        markedText = `${before}<Citation id="${ref.citationId}"/>${after}`;
      });

      // Add references section with proper URIs
      const referencesSection = references.size > 0
        ? `\n\n<references>\n${
          Array.from(references.values())
          .map(ref => {
            // Include the full URI in the reference element
            return `<reference id="${ref.citationId}" source="${ref.source}" url="${ref.uri}"/>`;
          }).join('\n')
        }\n</references>`
        : '';

      return {
        text: markedText + referencesSection,
        references: Array.from(references.values()),
        usage
      };

    } catch (error) {
      console.error('Error invoking Bedrock agent:', error);
      throw error;
    }
  }
}