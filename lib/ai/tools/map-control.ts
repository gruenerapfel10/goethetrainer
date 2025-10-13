import type { UIMessageStreamWriter } from 'ai';
import { z } from 'zod/v3';
import type { Session } from '@/types/next-auth';
import { MAJOR_CITIES, findCityByName, searchCities, type CityData } from '@/lib/mapbox/city-data';

interface MapControlProps {
  session: Session;
  dataStream: UIMessageStreamWriter;
}

// Country code to coordinates mapping for major countries
const COUNTRY_COORDINATES: Record<string, { iso: string; center: [number, number]; name: string }> = {
  // North America
  'united states': { iso: 'USA', center: [-95.7129, 37.0902], name: 'United States' },
  'us': { iso: 'USA', center: [-95.7129, 37.0902], name: 'United States' },
  'usa': { iso: 'USA', center: [-95.7129, 37.0902], name: 'United States' },
  'canada': { iso: 'CAN', center: [-106.3468, 56.1304], name: 'Canada' },
  'mexico': { iso: 'MEX', center: [-102.5528, 23.6345], name: 'Mexico' },
  
  // Europe
  'united kingdom': { iso: 'GBR', center: [-3.4360, 55.3781], name: 'United Kingdom' },
  'uk': { iso: 'GBR', center: [-3.4360, 55.3781], name: 'United Kingdom' },
  'france': { iso: 'FRA', center: [2.2137, 46.2276], name: 'France' },
  'germany': { iso: 'DEU', center: [10.4515, 51.1657], name: 'Germany' },
  'italy': { iso: 'ITA', center: [12.5674, 41.8719], name: 'Italy' },
  'spain': { iso: 'ESP', center: [-3.7492, 40.4637], name: 'Spain' },
  'poland': { iso: 'POL', center: [19.1451, 51.9194], name: 'Poland' },
  'ukraine': { iso: 'UKR', center: [31.1656, 48.3794], name: 'Ukraine' },
  'russia': { iso: 'RUS', center: [105.3188, 61.5240], name: 'Russia' },
  
  // Asia
  'china': { iso: 'CHN', center: [104.1954, 35.8617], name: 'China' },
  'japan': { iso: 'JPN', center: [138.2529, 36.2048], name: 'Japan' },
  'india': { iso: 'IND', center: [78.9629, 20.5937], name: 'India' },
  'south korea': { iso: 'KOR', center: [127.7669, 35.9078], name: 'South Korea' },
  'indonesia': { iso: 'IDN', center: [113.9213, -0.7893], name: 'Indonesia' },
  'thailand': { iso: 'THA', center: [100.9925, 15.8700], name: 'Thailand' },
  'vietnam': { iso: 'VNM', center: [108.2772, 14.0583], name: 'Vietnam' },
  'singapore': { iso: 'SGP', center: [103.8198, 1.3521], name: 'Singapore' },
  
  // Middle East
  'saudi arabia': { iso: 'SAU', center: [45.0792, 23.8859], name: 'Saudi Arabia' },
  'israel': { iso: 'ISR', center: [34.8516, 31.0461], name: 'Israel' },
  'iran': { iso: 'IRN', center: [53.6880, 32.4279], name: 'Iran' },
  'turkey': { iso: 'TUR', center: [35.2433, 38.9637], name: 'Turkey' },
  
  // Africa
  'egypt': { iso: 'EGY', center: [30.8025, 26.8206], name: 'Egypt' },
  'south africa': { iso: 'ZAF', center: [22.9375, -30.5595], name: 'South Africa' },
  'nigeria': { iso: 'NGA', center: [8.6753, 9.0820], name: 'Nigeria' },
  'kenya': { iso: 'KEN', center: [37.9062, -0.0236], name: 'Kenya' },
  
  // South America
  'brazil': { iso: 'BRA', center: [-51.9253, -14.2350], name: 'Brazil' },
  'argentina': { iso: 'ARG', center: [-63.6167, -38.4161], name: 'Argentina' },
  'chile': { iso: 'CHL', center: [-71.5430, -35.6751], name: 'Chile' },
  'colombia': { iso: 'COL', center: [-74.2973, 4.5709], name: 'Colombia' },
  'peru': { iso: 'PER', center: [-75.0152, -9.1900], name: 'Peru' },
  
  // Oceania
  'australia': { iso: 'AUS', center: [133.7751, -25.2744], name: 'Australia' },
  'new zealand': { iso: 'NZL', center: [174.8859, -40.9006], name: 'New Zealand' },
};

export const mapControl = ({
  session,
  dataStream,
}: MapControlProps) => {
  return {
    description: 'Control the interactive globe map - zoom to countries, cities, specific locations, or change map styles. Now supports city-level detail with major cities worldwide.',
    inputSchema: z.object({
      action: z.enum(['flyToCountry', 'flyToCity', 'flyToLocation', 'setStyle', 'searchCities']).describe('The action to perform on the map'),
      country: z.string().optional().describe('Country name to fly to (e.g., "United States", "China", "Germany")'),
      city: z.string().optional().describe('City name to fly to (e.g., "New York City", "London", "Tokyo")'),
      longitude: z.number().optional().describe('Longitude coordinate for location (-180 to 180)'),
      latitude: z.number().optional().describe('Latitude coordinate for location (-90 to 90)'),
      zoom: z.number().optional().default(5).describe('Zoom level (1-20, default 5)'),
      style: z.enum(['Standard', 'Light', 'Dark', 'Streets', 'Outdoors', 'Satellite', 'Satellite Streets', 'Navigation Day', 'Navigation Night']).optional().describe('Map style to apply'),
      query: z.string().optional().describe('Search query for cities'),
    }),
    execute: async ({ action, country, city, longitude, latitude, zoom, style, query }: any) => {
      try {
        switch (action) {
          case 'flyToCountry': {
            if (!country) {
              return {
                error: 'Country name is required for flyToCountry action',
                success: false,
              };
            }
            
            const countryData = COUNTRY_COORDINATES[country.toLowerCase()];
            if (!countryData) {
              return {
                error: `Country "${country}" not found. Available countries: ${Object.keys(COUNTRY_COORDINATES).join(', ')}`,
                success: false,
              };
            }
            
            // Send map control command to client via dataStream
            dataStream.write({
              'type': 'data',

              'value': [{
                type: 'map-control',
                content: JSON.stringify({
                  action: 'selectCountry',
                  data: {
                    iso: countryData.iso,
                    center: countryData.center,
                    name: countryData.name
                  }
                })
              }]
            });
            
            return {
              success: true,
              message: `Flying to ${countryData.name} and starting orbit animation`,
              data: {
                country: countryData.name,
                iso: countryData.iso,
                center: countryData.center,
              }
            };
          }
          
          case 'flyToCity': {
            if (!city) {
              return {
                error: 'City name is required for flyToCity action',
                success: false,
              };
            }
            
            const cityData = findCityByName(city);
            if (!cityData) {
              // Try searching for partial matches
              const searchResults = searchCities(city);
              if (searchResults.length > 0) {
                const suggestions = searchResults.slice(0, 5).map(c => `${c.name}, ${c.country}`).join(', ');
                return {
                  error: `City "${city}" not found. Did you mean: ${suggestions}?`,
                  success: false,
                  suggestions: searchResults.slice(0, 5),
                };
              }
              
              return {
                error: `City "${city}" not found. Try major cities like "New York City", "London", "Tokyo", etc.`,
                success: false,
              };
            }
            
            // Send map control command to client via dataStream
            dataStream.write({
              'type': 'data',

              'value': [{
                type: 'map-control',
                content: JSON.stringify({
                  action: 'flyToCity',
                  data: {
                    city: cityData.name,
                    country: cityData.country,
                    coordinates: cityData.coordinates,
                    zoom: cityData.zoomLevel,
                    boundingBox: cityData.boundingBox
                  }
                })
              }]
            });
            
            return {
              success: true,
              message: `Flying to ${cityData.name}, ${cityData.country}`,
              data: {
                city: cityData.name,
                country: cityData.country,
                coordinates: cityData.coordinates,
                zoom: cityData.zoomLevel,
                population: cityData.population,
              }
            };
          }
          
          case 'searchCities': {
            if (!query) {
              return {
                error: 'Query is required for searchCities action',
                success: false,
              };
            }
            
            const results = searchCities(query);
            if (results.length === 0) {
              return {
                success: false,
                message: `No cities found matching "${query}"`,
                data: {
                  results: [],
                }
              };
            }
            
            // Send search results to client
            dataStream.write({
              'type': 'data',

              'value': [{
                type: 'map-control',
                content: JSON.stringify({
                  action: 'searchResults',
                  data: {
                    query,
                    results: results.slice(0, 10).map(city => ({
                      name: city.name,
                      country: city.country,
                      coordinates: city.coordinates,
                      population: city.population,
                    }))
                  }
                })
              }]
            });
            
            return {
              success: true,
              message: `Found ${results.length} cities matching "${query}"`,
              data: {
                totalResults: results.length,
                results: results.slice(0, 10),
              }
            };
          }
          
          case 'flyToLocation': {
            if (longitude === undefined || latitude === undefined) {
              return {
                error: 'Longitude and latitude are required for flyToLocation action',
                success: false,
              };
            }
            
            if (longitude < -180 || longitude > 180) {
              return {
                error: 'Longitude must be between -180 and 180',
                success: false,
              };
            }
            
            if (latitude < -90 || latitude > 90) {
              return {
                error: 'Latitude must be between -90 and 90',
                success: false,
              };
            }
            
            // Send map control command to client via dataStream
            dataStream.write({
              'type': 'data',

              'value': [{
                type: 'map-control',
                content: JSON.stringify({
                  action: 'flyToLocation',
                  data: {
                    longitude,
                    latitude,
                    zoom: zoom || 5
                  }
                })
              }]
            });
            
            return {
              success: true,
              message: `Flying to coordinates (${longitude}, ${latitude}) at zoom level ${zoom || 5}`,
              data: {
                longitude,
                latitude,
                zoom: zoom || 5,
              }
            };
          }
          
          case 'setStyle': {
            if (!style) {
              return {
                error: 'Style parameter is required for setStyle action',
                success: false,
              };
            }
            
            // Send map control command to client via dataStream
            dataStream.write({
              'type': 'data',

              'value': [{
                type: 'map-control',
                content: JSON.stringify({
                  action: 'setStyle',
                  data: {
                    style
                  }
                })
              }]
            });
            
            return {
              success: true,
              message: `Changed map style to ${style}`,
              data: {
                style,
              }
            };
          }
          
          default:
            return {
              error: `Unknown action: ${action}`,
              success: false,
            };
        }
      } catch (error: any) {
        return {
          error: `Map control failed: ${error.message}`,
          success: false,
        };
      }
    },
  };
};