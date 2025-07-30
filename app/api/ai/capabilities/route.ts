import { NextRequest } from 'next/server'
import { createDataStreamResponse, streamText } from 'ai'
import { nanoid } from 'nanoid'
import { searchPlacesTool, addMarkersTool, searchLocationTool, generateAreaReportTool, flyToLocationTool, setMapStyleTool } from '@/lib/capabilities/mapbox'
import { google } from '@ai-sdk/google'

const systemPrompt = `You are an AI assistant for Global Meridian, a geospatial intelligence platform. You MUST be direct and decisive.

CORE BEHAVIOR:
1. When asked to place a marker, IMMEDIATELY:
   - Use search_places to get coordinates
   - Use add_markers with the FIRST/BEST result
   - DO NOT ask for clarification unless NO results found
   - DO NOT list options unless explicitly asked
   - NEVER wait for user confirmation

2. Location Priority:
   - For named places, use exact match first
   - For cities, use largest/most prominent
   - For ambiguous names, use most popular
   - ALWAYS prefer UK locations over others for common UK place names

Available tools:
- search_places: Get coordinates for locations
- add_markers: Place markers at coordinates
- search_location: Search and fly to location
- generate_area_report: Create area intelligence report
- fly_to_location: Navigate to location
- set_map_style: Change map style

Example correct behavior:
User: "Add marker at Covent Garden"
AI: *immediately searches and adds marker*
BAD behavior:
User: "Add marker at Covent Garden"
AI: "I found several options, which would you prefer?"

BE DECISIVE. BE QUICK. DO NOT SEEK PERMISSION.`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messages, context } = body

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Messages array is required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return createDataStreamResponse({
      execute: async (dataStream) => {
        try {
          const result = streamText({
            model: google('gemini-2.5-flash'),
            messages,
            experimental_generateMessageId: () => nanoid(),
            temperature: 0.7,
            maxSteps: 5,
            tools: {
              search_places: searchPlacesTool,
              add_markers: addMarkersTool,
              search_location: searchLocationTool,
              generate_area_report: generateAreaReportTool,
              fly_to_location: flyToLocationTool,
              set_map_style: setMapStyleTool
            },
            system: systemPrompt,
            onFinish: async ({ response, usage }) => {
              if (usage) {
                dataStream.writeMessageAnnotation({
                  type: 'cost_update',
                  data: {
                    toolName: 'mapbox_agent',
                    modelId: 'gemini-2.5-flash',
                    inputTokens: usage.promptTokens,
                    outputTokens: usage.completionTokens,
                    cost: 0 // Calculate actual cost if needed
                  }
                })
              }
            },
            onError: (error) => {
              console.error('Error in AI stream:', error)
              dataStream.writeMessageAnnotation({
                type: 'mapbox_update',
                data: {
                  id: nanoid(),
                  type: 'error',
                  status: 'failed',
                  message: `Error: ${error instanceof Error ? error.message : String(error)}`,
                  timestamp: Date.now()
                }
              })
            }
          })

          return result.mergeIntoDataStream(dataStream)
        } catch (error) {
          console.error('Error during stream setup:', error)
          dataStream.writeMessageAnnotation({
            type: 'mapbox_update',
            data: {
              id: nanoid(),
              type: 'error',
              status: 'failed',
              message: `Setup failed: ${error instanceof Error ? error.message : String(error)}`,
              timestamp: Date.now()
            }
          })
        }
      }
    })
  } catch (error) {
    console.error('Error processing request:', error)
    return new Response(JSON.stringify({ error: 'Failed to process request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
} 