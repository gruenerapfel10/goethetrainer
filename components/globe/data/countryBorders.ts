// High-resolution country border data
// We'll use geoBoundaries for the most detailed data

export interface CountryBorder {
  type: 'Feature';
  properties: {
    name: string;
    iso3: string;
    iso2: string;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

export interface CountryBordersCollection {
  type: 'FeatureCollection';
  features: CountryBorder[];
}

// For now, let's create a function to load borders dynamically
// We'll use the Natural Earth dataset from the DataHub.io source
export async function loadCountryBorders(): Promise<CountryBordersCollection> {
  try {
    // Using the DataHub.io GeoJSON source (Natural Earth 110m resolution)
    // For higher resolution, we could use 50m or 10m versions
    const response = await fetch(
      'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson'
    );
    
    if (!response.ok) {
      throw new Error('Failed to load country borders');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error loading country borders:', error);
    // Return empty collection as fallback
    return {
      type: 'FeatureCollection',
      features: []
    };
  }
}

// For ultra-high resolution US and Canada borders, we can use geoBoundaries
export async function loadHighResolutionBorders(countryCode: 'USA' | 'CAN'): Promise<any> {
  const urls = {
    // GeoBoundaries provides multiple admin levels
    // ADM0 = Country level, ADM1 = State/Province level
    USA: {
      country: 'https://www.geoboundaries.org/api/current/gbOpen/USA/ADM0/',
      states: 'https://www.geoboundaries.org/api/current/gbOpen/USA/ADM1/'
    },
    CAN: {
      country: 'https://www.geoboundaries.org/api/current/gbOpen/CAN/ADM0/',
      provinces: 'https://www.geoboundaries.org/api/current/gbOpen/CAN/ADM1/'
    }
  };

  try {
    // First fetch the metadata to get the actual GeoJSON URL
    const metadataResponse = await fetch(urls[countryCode].country);
    const metadata = await metadataResponse.json();
    
    // The metadata contains a gjDownloadURL field with the actual GeoJSON
    if (metadata.gjDownloadURL) {
      const geoResponse = await fetch(metadata.gjDownloadURL);
      return await geoResponse.json();
    }
  } catch (error) {
    console.error(`Error loading high-res borders for ${countryCode}:`, error);
  }
  
  return null;
}

// For development, let's create a simple inline dataset for USA and Canada
// This is simplified data - in production you'd load the full resolution data
export const USA_CANADA_BORDERS: CountryBordersCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        name: 'United States',
        iso3: 'USA',
        iso2: 'US'
      },
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          // Main continental US (simplified)
          [[
            [-125.0, 48.0], // Pacific Northwest
            [-125.0, 32.5], // California/Mexico border
            [-117.0, 32.5], // San Diego area
            [-114.0, 32.5], // Arizona
            [-109.0, 31.3], // New Mexico
            [-103.0, 28.9], // Texas
            [-97.0, 25.8],  // South Texas
            [-84.0, 24.5],  // Florida Keys
            [-80.0, 25.2],  // Miami
            [-81.0, 31.0],  // Georgia
            [-75.0, 35.0],  // North Carolina
            [-75.0, 40.0],  // Mid-Atlantic
            [-71.0, 41.0],  // New England
            [-67.0, 45.0],  // Maine
            [-67.0, 47.0],  // Northern Maine
            [-69.0, 47.5],  // Maine/Canada border
            [-74.0, 45.0],  // NY/Canada border
            [-83.0, 46.0],  // Michigan
            [-95.0, 49.0],  // Minnesota/Canada
            [-123.0, 49.0], // Washington/Canada
            [-125.0, 48.0]  // Back to start
          ]],
          // Alaska (simplified)
          [[
            [-168.0, 54.0],
            [-168.0, 71.5],
            [-141.0, 69.5],
            [-141.0, 60.0],
            [-168.0, 54.0]
          ]]
        ]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Canada',
        iso3: 'CAN',
        iso2: 'CA'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-141.0, 60.0],  // Alaska border
          [-141.0, 69.5],  // Arctic
          [-120.0, 69.0],  // Northwest Territories
          [-95.0, 69.0],   // Nunavut
          [-80.0, 73.0],   // Baffin Island
          [-65.0, 70.0],   // Hudson Bay
          [-55.0, 60.0],   // Labrador
          [-55.0, 47.0],   // Newfoundland
          [-60.0, 45.0],   // Maritime provinces
          [-67.0, 47.5],   // Maine border
          [-69.0, 47.0],   
          [-74.0, 45.0],   // Quebec/NY
          [-79.0, 43.0],   // Ontario/NY
          [-83.0, 42.0],   // Ontario/Michigan
          [-83.0, 46.0],   // Upper Michigan
          [-95.0, 49.0],   // Ontario/Minnesota
          [-123.0, 49.0],  // BC/Washington
          [-125.0, 50.0],  // BC Coast
          [-130.0, 54.0],  // Alaska panhandle
          [-141.0, 60.0]   // Back to Alaska border
        ]]
      }
    }
  ]
};

// Function to get country by coordinates
export function getCountryFromCoords(lat: number, lng: number, borders: CountryBordersCollection): string | null {
  // This is a simplified point-in-polygon test
  // In production, you'd use a proper library like turf.js
  for (const feature of borders.features) {
    // Simplified check - just for demonstration
    // Real implementation would properly test point-in-polygon
    if (feature.properties.iso2 === 'US') {
      if (lat >= 24.5 && lat <= 49.0 && lng >= -125.0 && lng <= -67.0) {
        return 'United States';
      }
    } else if (feature.properties.iso2 === 'CA') {
      if (lat >= 42.0 && lat <= 73.0 && lng >= -141.0 && lng <= -55.0) {
        return 'Canada';
      }
    }
  }
  return null;
} 