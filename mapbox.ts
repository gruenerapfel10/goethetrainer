import { tool } from 'ai'
import { z } from 'zod/v3';
import { MAP_STYLES } from '@/components/ui/map-style-selector'

// Mapbox-specific parameter schemas
const SearchPlacesSchema = z.object({
  query: z.string().describe('The place or location to search for'),
  limit: z.number().optional().default(5),
  longitude: z.number().optional(),
  latitude: z.number().optional(),
  type: z.string().optional().default('place')
})

const AddMarkersSchema = z.object({
  name: z.string().describe('Name or label for the marker'),
  longitude: z.number().describe('Longitude coordinate (must be between -180 and 180)'),
  latitude: z.number().describe('Latitude coordinate (must be between -90 and 90)'),
  category: z.string().optional().default('custom')
})

const SearchLocationSchema = z.object({
  query: z.string().describe('The location to search for'),
  longitude: z.number().optional(),
  latitude: z.number().optional(),
  radius: z.number().optional()
})

const GenerateAreaReportSchema = z.object({
  longitude: z.number().describe('Longitude coordinate (must be between -180 and 180)'),
  latitude: z.number().describe('Latitude coordinate (must be between -90 and 90)'),
  radius: z.number().default(1000)
})

const FlyToLocationSchema = z.object({
  longitude: z.number().describe('Longitude coordinate (must be between -180 and 180)'),
  latitude: z.number().describe('Latitude coordinate (must be between -90 and 90)'),
  zoom: z.number().optional().default(10)
})

const SetMapStyleSchema = z.object({
  style: z.enum(Object.keys(MAP_STYLES) as [string, ...string[]])
})

// Real Mapbox Geocoding API with fallback to mock data
async function geocodeLocation(query: string): Promise<[number, number] | null> {
  // Get Mapbox access token
  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
  
  if (MAPBOX_TOKEN && MAPBOX_TOKEN !== 'YOUR_MAPBOX_TOKEN_HERE') {
    try {
      // Use real Mapbox Geocoding API v6
      const encodedQuery = encodeURIComponent(query)
      const geocodeUrl = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodedQuery}&access_token=${MAPBOX_TOKEN}&limit=1`
      
      const response = await fetch(geocodeUrl)
      
      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0]
        const coordinates = feature.geometry.coordinates
        return [coordinates[0], coordinates[1]] // [lng, lat]
      }
    } catch (error) {
      console.warn('Mapbox Geocoding API failed, falling back to mock data:', error)
    }
  }
  
  // Enhanced fallback with more locations and better matching
  const mockLocations: Record<string, [number, number]> = {
    // London area
    'covent garden': [-0.1240, 51.5118],
    'covent garden london': [-0.1240, 51.5118],
    'london': [-0.1276, 51.5074],
    'london uk': [-0.1276, 51.5074],
    'london england': [-0.1276, 51.5074],
    'big ben': [-0.1276, 51.4994],
    'tower bridge': [-0.0754, 51.5055],
    'westminster': [-0.1366, 51.4975],
    'piccadilly circus': [-0.1347, 51.5100],
    'oxford street': [-0.1419, 51.5154],
    'camden market': [-0.1436, 51.5412],
    
    // New York area
    'new york': [-74.0060, 40.7128],
    'times square': [-73.9857, 40.7580],
    'central park': [-73.9654, 40.7829],
    'brooklyn bridge': [-73.9969, 40.7061],
    'manhattan': [-73.9712, 40.7831],
    
    // Other major cities
    'paris': [2.3522, 48.8566],
    'tokyo': [139.6917, 35.6895],
    'sydney': [151.2093, -33.8688],
    'berlin': [13.4050, 52.5200],
    'rome': [12.4964, 41.9028],
    'barcelona': [2.1734, 41.3851],
    'amsterdam': [4.9041, 52.3676],
    'moscow': [37.6173, 55.7558],
    'beijing': [116.4074, 39.9042],
    'mumbai': [72.8777, 19.0760]
  }
  
  // Case-insensitive search with partial matching
  const queryLower = query.toLowerCase()
  
  // Direct match
  if (mockLocations[queryLower]) {
    return mockLocations[queryLower]
  }
  
  // Partial match
  for (const [location, coords] of Object.entries(mockLocations)) {
    if (location.includes(queryLower) || queryLower.includes(location)) {
      return coords
    }
  }
  
  return null
}

// Search for multiple place suggestions using Mapbox Geocoding API
async function searchPlaces(query: string, limit: number = 5, longitude?: number, latitude?: number, type?: string): Promise<any[]> {
  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
  
  if (MAPBOX_TOKEN && MAPBOX_TOKEN !== 'YOUR_MAPBOX_TOKEN_HERE') {
    try {
      const encodedQuery = encodeURIComponent(query)
      let geocodeUrl = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodedQuery}&access_token=${MAPBOX_TOKEN}&limit=${limit}`
      
      // Add optional parameters
      if (longitude && latitude) {
        geocodeUrl += `&proximity=${longitude},${latitude}`
      }
      
      if (type) {
        geocodeUrl += `&types=${type}`
      }
      
      const response = await fetch(geocodeUrl)
      
      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.features && data.features.length > 0) {
        return data.features.map((feature: any) => ({
          id: feature.id,
          name: feature.properties?.name || feature.text,
          place_name: feature.properties?.full_address || feature.place_name,
          longitude: feature.geometry.coordinates[0],
          latitude: feature.geometry.coordinates[1],
          relevance: feature.properties?.accuracy || 1,
          place_type: feature.place_type?.[0] || 'place'
        }))
      }
    } catch (error) {
      console.warn('Mapbox Places API failed, falling back to mock data:', error)
    }
  }
  
  // Enhanced fallback with suggestions for common queries
  const generateMockSuggestions = (query: string): any[] => {
    const queryLower = query.toLowerCase()
    
    if (queryLower.includes('covent garden') || queryLower.includes('coventgarden')) {
      return [
        {
          id: 'mock-1',
          name: 'Covent Garden',
          place_name: 'Covent Garden, London, England, United Kingdom',
          longitude: -0.1240,
          latitude: 51.5118,
          relevance: 1.0,
          place_type: 'poi'
        }
      ]
    } else if (queryLower.includes('london')) {
      return [
        {
          id: 'mock-4',
          name: 'London',
          place_name: 'London, England, United Kingdom',
          longitude: -0.1276,
          latitude: 51.5074,
          relevance: 1.0,
          place_type: 'place'
        }
      ]
    }
    
    return []
  }
  
  return generateMockSuggestions(query)
}

// Mapbox Tools using Vercel AI SDK tool() function
export const searchPlacesTool = tool({
  description: 'Search for places and get multiple suggestions with coordinates (like Google Maps search)',
  inputSchema: SearchPlacesSchema,
  execute: async ({ query, limit, longitude, latitude, type }) => {
    const suggestions = await searchPlaces(query, limit, longitude, latitude, type)
    
    if (suggestions.length === 0) {
      throw new Error(`No places found for "${query}". Try a different search term.`)
    }

    return {
      success: true,
      message: `Found ${suggestions.length} places for "${query}"`,
      suggestions: suggestions,
      total: suggestions.length
    }
  }
})

export const addMarkersTool = tool({
  description: 'Add a marker to the map at specific coordinates',
  inputSchema: AddMarkersSchema,
  execute: async ({ name, longitude, latitude, category }) => {
    return {
      success: true,
      message: `Added marker "${name}" at coordinates (${longitude}, ${latitude})`,
      marker: { name, longitude, latitude, category }
    }
  }
})

export const searchLocationTool = tool({
  description: 'Search for a location and get its coordinates',
  inputSchema: SearchLocationSchema,
  execute: async ({ query, longitude, latitude, radius }) => {
    const coords = await geocodeLocation(query)
    if (!coords) {
      throw new Error(`Location "${query}" not found`)
    }
    
    return {
      success: true,
      message: `Found location "${query}"`,
      location: {
        name: query,
        longitude: coords[0],
        latitude: coords[1]
      }
    }
  }
})

export const generateAreaReportTool = tool({
  description: 'Generate an intelligence report for a specific area',
  inputSchema: GenerateAreaReportSchema,
  execute: async ({ longitude, latitude, radius }) => {
    return {
      success: true,
      message: `Generated area report for coordinates (${longitude}, ${latitude})`,
      report: {
        coordinates: { longitude, latitude },
        radius,
        timestamp: new Date().toISOString()
      }
    }
  }
})

export const flyToLocationTool = tool({
  description: 'Navigate the map to a specific location',
  inputSchema: FlyToLocationSchema,
  execute: async ({ longitude, latitude, zoom }) => {
    return {
      success: true,
      message: `Flying to coordinates (${longitude}, ${latitude})`,
      location: {
        longitude,
        latitude,
        zoom
      }
    }
  }
})

export const setMapStyleTool = tool({
  description: 'Change the visual style of the map',
  inputSchema: SetMapStyleSchema,
  execute: async ({ style }) => {
    return {
      success: true,
      message: `Changed map style to "${style}"`,
      style
    }
  }
})

// Export all tools for use in the AI service
export const mapboxTools = {
  search_places: searchPlacesTool,
  add_markers: addMarkersTool,
  search_location: searchLocationTool,
  generate_area_report: generateAreaReportTool,
  fly_to_location: flyToLocationTool,
  set_map_style: setMapStyleTool
} 