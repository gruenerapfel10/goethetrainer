// Import Firecrawl instead of Tavily
import { DataStreamWriter, tool } from 'ai';
import { z } from 'zod';
import { Session } from 'next-auth';
// Add Firecrawl import
import FirecrawlApp from '@/lib/firecrawl/firecrawl-client';

import { jsonrepair } from 'jsonrepair';

import { myProvider } from '../models';
import { generateObjectWithParsing } from '../../parsingUtils';

interface DeepResearchProps {
  session: Session;
  dataStream: DataStreamWriter;
}

const JSON_SYSTEM_PROMPT = `You are an AI assistant that provides valid JSON responses when requested.

CRITICAL JSON FORMAT RULES:
1. Arrays must use proper [] syntax without surrounding quotes
2. Objects must use proper {} syntax without surrounding quotes
3. Never include XML/HTML tags in JSON output
4. Use appropriate data types (arrays for lists, objects for key-value pairs)

CORRECT EXAMPLES:
"data": ["item1", "item2"]
"user": {"name": "John", "age": 30}
"findings": [{"insight": "text", "evidence": ["item1", "item2"]}]

INCORRECT EXAMPLES:
"data": "[\"item1\", \"item2\"]"  // Array as string
"user": "{\"name\": \"John\"}"    // Object as string
"results": "<results>data</results>"  // HTML in JSON

VERIFICATION CHECKLIST:
- Arrays and objects are not enclosed in quotes
- No XML/HTML tags are present
- Nested structures maintain proper formatting
- The entire response is valid JSON that would pass JSON.parse()

EXPECTED FORMAT:
{
  "field1": value,
  "field2": [item1, item2],
  "field3": {"key": "value"}
}`;

const firecrawl = new FirecrawlApp(process.env.FIRECRAWL_URL || '');

export const deepResearch = ({ session, dataStream }: DeepResearchProps) => {
  return tool({
    description:
      'Perform a reasoned web search with multiple steps and sources.',
    parameters: z.object({
      topic: z.string().describe('The main topic or question to research'),
      depth: z
        .enum(['basic', 'advanced'])
        .describe('Search depth level')
        .default('basic'),
    }),
    execute: async ({
      topic,
      depth,
    }: {
      topic: string;
      depth: 'basic' | 'advanced';
    }) => {
      dataStream.writeMessageAnnotation({
        type: 'research_update',
        data: {
          id: 'research-plan-initial',
          type: 'plan',
          status: 'running',
          title: 'Research Plan',
          message: 'Creating research plan...',
          timestamp: Date.now(),
          overwrite: true,
        },
      });

      const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const researchPlanPrompt = `Create a focused research plan for the topic: "${topic}". 
      
      Today's date and day of the week: ${currentDate}

      Keep the plan concise but comprehensive, with:
      - 1-4 targeted search queries (all using web search only)
      - 1-2 key analyses to perform
      - Prioritize the most important aspects to investigate
      
      IMPORTANT JSON STRUCTURE REQUIREMENTS:
      1. Your response must be valid JSON with this exact structure:
      {
        "search_queries": [
          {
            "query": "string",
            "rationale": "string",
            "source": "web",
            "priority": number
          }
        ],
        "required_analyses": [
          {
            "type": "string",
            "description": "string",
            "importance": number
          }
        ]
      }
      
      2. The "search_queries" and "required_analyses" fields must be actual arrays, not strings
      3. Do not use floating numbers, use whole numbers between 2-4 for priority/importance fields
      4. All search queries MUST use "source": "web" only
      
      Consider different angles and potential controversies, but maintain focus on the core aspects.
      Ensure the total number of steps (searches + analyses) does not exceed 6.`;

      // For research plan schema:
      const researchPlanSchema = z.object({
        search_queries: z.preprocess(
          (val) => {
            if (typeof val === 'string') {
              try {
                // Clean any tags and repair JSON
                const cleaned = val.replace(/<[^>]*>|<\/[^>]*>/g, '');
                return JSON.parse(jsonrepair(cleaned));
              } catch (e) {
                return [];
              }
            }
            return val;
          },
          z.array(
            z.object({
              query: z.string(),
              rationale: z.string(),
              source: z.literal('web'),
              priority: z.number().min(1).max(5),
            }),
          ),
        ),
        required_analyses: z.preprocess(
          (val) => {
            if (typeof val === 'string') {
              try {
                const cleaned = val.replace(/<[^>]*>|<\/[^>]*>/g, '');
                return JSON.parse(jsonrepair(cleaned));
              } catch (e) {
                return [];
              }
            }
            return val;
          },
          z.array(
            z.object({
              type: z.string(),
              description: z.string(),
              importance: z.number().min(1).max(5),
            }),
          ),
        ),
      });

      let researchPlan;
      try {
        const result = await generateObjectWithParsing({
          model: myProvider.languageModel('bedrock-sonnet-latest'),
          schema: researchPlanSchema,
          prompt: researchPlanPrompt,
          system: JSON_SYSTEM_PROMPT,
          temperature: 0,
        });
        debugger;
        researchPlan = result.object;
      } catch (error) {
        console.error('Research plan generation failed:', error);

        researchPlan = {
          search_queries: [
            {
              query: topic,
              rationale: 'Initial broad search to understand the topic',
              source: 'web',
              priority: 3,
            },
          ],
          required_analyses: [
            {
              type: 'overview',
              description: 'General analysis of the main aspects of the topic',
              importance: 4,
            },
          ],
        };
      }

      const generateStepIds = (plan: typeof researchPlan) => {
        // Only create web search steps
        const searchSteps = plan.search_queries.map((query, index) => ({
          id: `search-web-${index}`,
          type: 'web',
          query,
        }));

        const analysisSteps = plan.required_analyses.map((analysis, index) => ({
          id: `analysis-${index}`,
          type: 'analysis',
          analysis,
        }));

        return {
          planId: 'research-plan',
          searchSteps,
          analysisSteps,
        };
      };

      const stepIds = generateStepIds(researchPlan);
      let completedSteps = 0;
      const totalSteps =
        stepIds.searchSteps.length + stepIds.analysisSteps.length;

      dataStream.writeMessageAnnotation({
        type: 'research_update',
        data: {
          id: stepIds.planId,
          type: 'plan',
          status: 'completed',
          title: 'Research Plan',
          plan: researchPlan,
          totalSteps: totalSteps,
          message: 'Research plan created',
          timestamp: Date.now(),
          overwrite: true,
        },
      });

      const searchResults = [];
      let searchIndex = 0;

      for (const step of stepIds.searchSteps) {
        dataStream.writeMessageAnnotation({
          type: 'research_update',
          data: {
            id: step.id,
            type: step.type,
            status: 'running',
            title: `Searching the web for "${step.query.query}"`,
            query: step.query.query,
            message: `Searching web sources...`,
            timestamp: Date.now(),
          },
        });

        // Perform web search with Firecrawl
        const searchOptions = {
          limit: Math.min(6 - step.query.priority, 10),
          scrapeOptions: {
            formats: ['markdown'],
          },
          timeout: depth === 'advanced' ? 30000 : 15000,
        };

        const webResults = await firecrawl.search(
          step.query.query,
          searchOptions,
        );

        searchResults.push({
          type: 'web',
          query: step.query,
          results: webResults.data.map((r) => ({
            source: 'web',
            title: r.title || '',
            url: r.url || '',
            content: r.markdown || r.description || '',
          })),
        });

        completedSteps++;

        // Send completed annotation for the search step
        dataStream.writeMessageAnnotation({
          type: 'research_update',
          data: {
            id: step.id,
            type: step.type,
            status: 'completed',
            title: `Searched the web for "${step.query.query}"`,
            query: step.query.query,
            results: searchResults[searchResults.length - 1].results.map(
              (r) => {
                return { ...r };
              },
            ),
            message: `Found ${
              searchResults[searchResults.length - 1].results.length
            } results`,
            timestamp: Date.now(),
            overwrite: true,
          },
        });

        searchIndex++;
      }

      const analysisSchema = z.object({
        findings: z.preprocess(
          (val) => {
            if (typeof val === 'string') {
              try {
                return JSON.parse(jsonrepair(val));
              } catch (e) {
                return [];
              }
            }
            return val;
          },
          z.array(
            z.object({
              insight: z.string(),
              evidence: z.array(z.string()),
              confidence: z.number().min(0).max(1),
            }),
          ),
        ),
        implications: z.array(z.string()),
        limitations: z.array(z.string()),
      });

      // Perform analyses
      let analysisIndex = 0;

      for (const step of stepIds.analysisSteps) {
        dataStream.writeMessageAnnotation({
          type: 'research_update',
          data: {
            id: step.id,
            type: 'analysis',
            status: 'running',
            title: `Analyzing ${step.analysis.type}`,
            analysisType: step.analysis.type,
            message: `Analyzing ${step.analysis.type}...`,
            timestamp: Date.now(),
          },
        });

        // Enhanced analysis prompt with JSON structure instructions
        const analysisPrompt = `Perform a ${
          step.analysis.type
        } analysis on the search results. ${step.analysis.description}
Consider all sources and their reliability.

IMPORTANT JSON STRUCTURE REQUIREMENTS:
{
  "findings": [
    {
      "insight": "string with key insight",
      "evidence": ["string with evidence", "another piece of evidence"],
      "confidence": number between 0 and 1
    }
  ],
  "implications": ["string with implication"],
  "limitations": ["string with limitation"]
}

DO NOT STRINGIFY ANY ARRAYS. Each array must be a proper JSON array.
Example of INCORRECT format: "findings": "[{...}]"
Example of CORRECT format: "findings": [{...}]

Your response MUST be ONLY the JSON object with no additional text.
Do not use markdown code blocks. Do not add explanations.

Search results: ${JSON.stringify(searchResults)}`;

        try {
          // Generate analysis with JSON-structured model
          const { object: analysisResult } = await generateObjectWithParsing({
            model: myProvider.languageModel('bedrock-sonnet-latest'),
            schema: analysisSchema,
            prompt: analysisPrompt,
            temperature: 0.1,
            system: JSON_SYSTEM_PROMPT,
          });
          debugger;
          dataStream.writeMessageAnnotation({
            type: 'research_update',
            data: {
              id: step.id,
              type: 'analysis',
              status: 'completed',
              title: `Analysis of ${step.analysis.type} complete`,
              analysisType: step.analysis.type,
              findings: analysisResult.findings,
              message: `Analysis complete`,
              timestamp: Date.now(),
              overwrite: true,
            },
          });
        } catch (error) {
          console.error(`Analysis failed for ${step.analysis.type}:`, error);

          // Fallback: create a basic analysis result if generation fails
          dataStream.writeMessageAnnotation({
            type: 'research_update',
            data: {
              id: step.id,
              type: 'analysis',
              status: 'completed',
              title: `Analysis of ${step.analysis.type} (partial)`,
              analysisType: step.analysis.type,
              findings: [
                {
                  insight: `Analysis of ${step.analysis.type} encountered technical difficulties`,
                  evidence: [
                    'The analysis engine experienced validation errors while processing results.',
                    'A simplified analysis is provided instead of the full detailed analysis.',
                  ],
                  confidence: 0.5,
                },
              ],
              message: `Analysis completed with limited results`,
              timestamp: Date.now(),
              overwrite: true,
            },
          });
        }

        analysisIndex++;
      }

      // Define gap analysis schema
      const gapAnalysisSchema = z.object({
        limitations: z.array(
          z.object({
            type: z.string(),
            description: z.string(),
            severity: z.number().min(2).max(10),
            potential_solutions: z.array(z.string()),
          }),
        ),
        knowledge_gaps: z.array(
          z.object({
            topic: z.string(),
            reason: z.string(),
            additional_queries: z.array(z.string()),
          }),
        ),
        recommended_followup: z.array(
          z.object({
            action: z.string(),
            rationale: z.string(),
            priority: z.number().min(2).max(10),
          }),
        ),
      });

      // After all analyses are complete, send running state for gap analysis
      dataStream.writeMessageAnnotation({
        type: 'research_update',
        data: {
          id: 'gap-analysis',
          type: 'analysis',
          status: 'running',
          title: 'Research Gaps and Limitations',
          analysisType: 'gaps',
          message: 'Analyzing research gaps and limitations...',
          timestamp: Date.now(),
        },
      });

      // Enhanced gap analysis prompt with JSON structure instructions
      const gapAnalysisPrompt = `Analyze the research results and identify limitations, knowledge gaps, and recommended follow-up actions.
      Consider:
      - Quality and reliability of sources
      - Missing perspectives or data
      - Areas needing deeper investigation
      - Potential biases or conflicts
      
      IMPORTANT JSON STRUCTURE REQUIREMENTS:
      1. Your response must be valid JSON with this exact structure:
      {
        "limitations": [
          {
            "type": "string",
            "description": "string",
            "severity": number between 2 and 10,
            "potential_solutions": ["string", "string"]
          }
        ],
        "knowledge_gaps": [
          {
            "topic": "string",
            "reason": "string",
            "additional_queries": ["string", "string"]
          }
        ],
        "recommended_followup": [
          {
            "action": "string",
            "rationale": "string",
            "priority": number between 2 and 10
          }
        ]
      }
      
      2. All array fields must be actual arrays, not strings
      3. The "potential_solutions" and "additional_queries" fields must be arrays of strings
      4. Do not include any text outside the JSON structure
      
      Research results: ${JSON.stringify(searchResults)}
      Analysis findings: ${JSON.stringify(
        stepIds.analysisSteps.map((step) => ({
          type: step.analysis.type,
          description: step.analysis.description,
          importance: step.analysis.importance,
        })),
      )}`;

      let gapAnalysis;
      try {
        // Generate gap analysis with JSON-structured model
        // First, enhance the prompt to be more explicit about JSON structure
        const enhancedGapPrompt = `${gapAnalysisPrompt}
        
        CRITICAL: DO NOT STRINGIFY ARRAYS OR OBJECTS IN YOUR RESPONSE!
        Arrays must be actual arrays like ["item1", "item2"], not strings containing array syntax.
        Make sure each field that should be an array is an actual JSON array, not a string.
        Example of CORRECT format:
        {
          "limitations": [
            {
              "type": "string value",
              "description": "string value",
              "severity": 8,
              "potential_solutions": ["solution1", "solution2"]
            }
          ],
          "knowledge_gaps": [
            {
              "topic": "string value",
              "reason": "string value",
              "additional_queries": ["query1", "query2"]
            }
          ],
          "recommended_followup": [
            {
              "action": "string value",
              "rationale": "string value", 
              "priority": 7
            }
          ]
        }`;

        const result = await generateObjectWithParsing({
          model: myProvider.languageModel('bedrock-sonnet-latest'),
          schema: gapAnalysisSchema,
          prompt: enhancedGapPrompt,
          temperature: 0,
          system: JSON_SYSTEM_PROMPT,
        });

        gapAnalysis = result.object;

        // Send gap analysis update
        dataStream.writeMessageAnnotation({
          type: 'research_update',
          data: {
            id: 'gap-analysis',
            type: 'analysis',
            status: 'completed',
            title: 'Research Gaps and Limitations',
            analysisType: 'gaps',
            findings: gapAnalysis.limitations.map((l) => ({
              insight: l.description,
              evidence: l.potential_solutions,
              confidence: (6 - l.severity) / 5,
            })),
            gaps: gapAnalysis.knowledge_gaps,
            recommendations: gapAnalysis.recommended_followup,
            message: `Identified ${gapAnalysis.limitations.length} limitations and ${gapAnalysis.knowledge_gaps.length} knowledge gaps`,
            timestamp: Date.now(),
            overwrite: true,
            completedSteps: completedSteps + 1,
            totalSteps: totalSteps + (depth === 'advanced' ? 2 : 1),
          },
        });
      } catch (error) {
        console.error('Gap analysis failed:', error);

        // Fallback: provide a basic gap analysis if generation fails
        gapAnalysis = {
          limitations: [
            {
              type: 'data completeness',
              description:
                'The research has some inherent limitations in scope and coverage',
              severity: 5,
              potential_solutions: [
                'Additional research',
                'Broader source selection',
              ],
            },
          ],
          knowledge_gaps: [
            {
              topic: 'Additional research areas',
              reason:
                'Technical limitations prevented comprehensive gap analysis',
              additional_queries: ['Further targeted research recommended'],
            },
          ],
          recommended_followup: [
            {
              action: 'Consider follow-up research',
              rationale: 'To address potential knowledge gaps',
              priority: 5,
            },
          ],
        };

        dataStream.writeMessageAnnotation({
          type: 'research_update',
          data: {
            id: 'gap-analysis',
            type: 'analysis',
            status: 'completed',
            title: 'Research Gaps and Limitations (simplified)',
            analysisType: 'gaps',
            findings: gapAnalysis.limitations.map((l) => ({
              insight: l.description,
              evidence: l.potential_solutions,
              confidence: (6 - l.severity) / 5,
            })),
            gaps: gapAnalysis.knowledge_gaps,
            recommendations: gapAnalysis.recommended_followup,
            message: 'Identified research limitations (simplified analysis)',
            timestamp: Date.now(),
            overwrite: true,
            completedSteps: completedSteps + 1,
            totalSteps: totalSteps + (depth === 'advanced' ? 2 : 1),
          },
        });
      }

      let synthesis;

      if (depth === 'advanced' && gapAnalysis.knowledge_gaps.length > 0) {
        const additionalQueries = gapAnalysis.knowledge_gaps.flatMap((gap) =>
          gap.additional_queries.map((query) => ({
            query,
            rationale: gap.reason,
            source: 'web',
            priority: 3,
          })),
        );

        // Execute additional searches for gaps
        for (const query of additionalQueries) {
          // Generate a unique ID for this gap search
          const gapSearchId = `gap-search-${searchIndex++}`;

          // Send running annotation for this gap search
          dataStream.writeMessageAnnotation({
            type: 'research_update',
            data: {
              id: gapSearchId,
              type: 'web',
              status: 'running',
              title: `Additional search for "${query.query}"`,
              query: query.query,
              message: `Searching to fill knowledge gap: ${query.rationale}`,
              timestamp: Date.now(),
            },
          });

          // Firecrawl search for gap analysis
          const searchOptions = {
            limit: 2,
            scrapeOptions: {
              formats: ['markdown'],
            },
            timeout: depth === 'advanced' ? 30000 : 15000,
          };

          const webResults = await firecrawl.search(query.query, searchOptions);

          // Add to search results with Firecrawl format
          searchResults.push({
            type: 'web',
            query: {
              query: query.query,
              rationale: query.rationale,
              source: 'web',
              priority: query.priority,
            },
            results: webResults.data.map((r) => ({
              source: 'web',
              title: r.title || '',
              url: r.url || '',
              content: r.markdown || r.description || '',
            })),
          });

          // Send completed annotation for web search
          dataStream.writeMessageAnnotation({
            type: 'research_update',
            data: {
              id: gapSearchId,
              type: 'web',
              status: 'completed',
              title: `Additional web search for "${query.query}"`,
              query: query.query,
              results: webResults.data.map((r) => ({
                source: 'web',
                title: r.title || '',
                url: r.url || '',
                content: r.markdown || r.description || '',
              })),
              message: `Found ${webResults.data.length} results`,
              timestamp: Date.now(),
              overwrite: true,
            },
          });

          completedSteps++;
        }

        // Define synthesis schema
        const synthesisSchema = z.object({
          key_findings: z.array(
            z.object({
              finding: z.string(),
              confidence: z.number().min(0).max(1),
              supporting_evidence: z.array(z.string()),
            }),
          ),
          remaining_uncertainties: z.array(z.string()),
        });

        // Send running state for final synthesis
        dataStream.writeMessageAnnotation({
          type: 'research_update',
          data: {
            id: 'final-synthesis',
            type: 'analysis',
            status: 'running',
            title: 'Final Research Synthesis',
            analysisType: 'synthesis',
            message: 'Synthesizing all research findings...',
            timestamp: Date.now(),
          },
        });

        // Enhanced synthesis prompt with JSON structure instructions
        const synthesisPrompt = `Synthesize all research findings, including gap analysis and follow-up research.
        Highlight key conclusions and remaining uncertainties.
        
        IMPORTANT JSON STRUCTURE REQUIREMENTS:
        1. Your response must be valid JSON with this exact structure:
        {
          "key_findings": [
            {
              "finding": "string with finding",
              "confidence": number between 0 and 1,
              "supporting_evidence": ["string with evidence", "another evidence"]
            }
          ],
          "remaining_uncertainties": [
            "string with uncertainty"
          ]
        }
        
        2. All array fields must be actual arrays, not strings
        3. The "key_findings", "supporting_evidence", and "remaining_uncertainties" fields must be arrays
        4. Do not include any text outside the JSON structure
        
        CRITICAL FORMATTING INSTRUCTIONS:
        - NEVER return arrays as strings like "key_findings": "[{...}]" - this will cause parsing errors
        - ALWAYS use proper JSON array syntax: "key_findings": [{...}]
        - DO NOT include HTML or markdown formatting in your JSON
        - Make sure each array field is an actual JSON array, not a string representation
        - The "remaining_uncertainties" must be an array of strings, not an object
        
        Here is an example of correct formatting:
        {
          "key_findings": [
            {
              "finding": "Example finding",
              "confidence": 0.9,
              "supporting_evidence": ["Evidence 1", "Evidence 2"]
            }
          ],
          "remaining_uncertainties": [
            "Uncertainty 1",
            "Uncertainty 2"
          ]
        }
        
        Original results: ${JSON.stringify(searchResults)}
        Gap analysis: ${JSON.stringify(gapAnalysis)}
        Additional findings: ${JSON.stringify(additionalQueries)}`;

        try {
          // Generate final synthesis with JSON-structured model
          const { object: finalSynthesis } = await generateObjectWithParsing({
            model: myProvider.languageModel('bedrock-sonnet-latest'),
            schema: synthesisSchema,
            prompt: synthesisPrompt,
            temperature: 0,
            system: JSON_SYSTEM_PROMPT,
          });

          synthesis = finalSynthesis;

          // Send final synthesis update
          dataStream.writeMessageAnnotation({
            type: 'research_update',
            data: {
              id: 'final-synthesis',
              type: 'analysis',
              status: 'completed',
              title: 'Final Research Synthesis',
              analysisType: 'synthesis',
              findings: finalSynthesis.key_findings.map((f) => ({
                insight: f.finding,
                evidence: f.supporting_evidence,
                confidence: f.confidence,
              })),
              uncertainties: finalSynthesis.remaining_uncertainties,
              message: `Synthesized ${finalSynthesis.key_findings.length} key findings`,
              timestamp: Date.now(),
              overwrite: true,
              completedSteps: totalSteps + (depth === 'advanced' ? 2 : 1) - 1,
              totalSteps: totalSteps + (depth === 'advanced' ? 2 : 1),
            },
          });
        } catch (error) {
          console.error('Final synthesis generation failed:', error);

          // Fallback: provide a basic synthesis if generation fails
          synthesis = {
            key_findings: [
              {
                finding:
                  'The research conducted has provided valuable insights despite technical limitations',
                supporting_evidence: [
                  'Multiple search queries were executed successfully',
                  'A variety of sources were consulted',
                ],
                confidence: 0.7,
              },
            ],
            remaining_uncertainties: [
              'Some analyses encountered technical difficulties',
              'A more comprehensive synthesis would require additional processing',
            ],
          };

          dataStream.writeMessageAnnotation({
            type: 'research_update',
            data: {
              id: 'final-synthesis',
              type: 'analysis',
              status: 'completed',
              title: 'Final Research Synthesis (simplified)',
              analysisType: 'synthesis',
              findings: synthesis.key_findings.map((f) => ({
                insight: f.finding,
                evidence: f.supporting_evidence,
                confidence: f.confidence,
              })),
              uncertainties: synthesis.remaining_uncertainties,
              message: 'Synthesized findings with limited results',
              timestamp: Date.now(),
              overwrite: true,
              completedSteps: totalSteps + (depth === 'advanced' ? 2 : 1) - 1,
              totalSteps: totalSteps + (depth === 'advanced' ? 2 : 1),
            },
          });
        }
      }

      // Final progress update
      const finalProgress = {
        id: 'research-progress',
        type: 'progress' as const,
        status: 'completed' as const,
        message: `Research complete`,
        completedSteps: totalSteps + (depth === 'advanced' ? 2 : 1),
        totalSteps: totalSteps + (depth === 'advanced' ? 2 : 1),
        isComplete: true,
        timestamp: Date.now(),
      };

      dataStream.writeMessageAnnotation({
        type: 'research_update',
        data: {
          ...finalProgress,
          overwrite: true,
        },
      });

      return {
        plan: researchPlan,
        results: searchResults,
        synthesis: synthesis,
      };
    },
  });
};
