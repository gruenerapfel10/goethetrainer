// Export mapbox tools using Vercel AI SDK
export { mapboxTools } from './mapbox'
import { mapboxTools } from './mapbox'

// Initialize all capabilities
export function initializeCapabilities() {
  console.log('Mapbox tools initialized:', Object.keys(mapboxTools).length, 'tools available')
} 