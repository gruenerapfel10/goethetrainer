/**
 * City Data and Boundaries
 * Major cities with their coordinates and suggested zoom levels
 */

export interface CityData {
  name: string;
  country: string;
  countryCode: string;
  coordinates: [number, number]; // [longitude, latitude]
  population?: number;
  zoomLevel: number;
  boundingBox?: [[number, number], [number, number]]; // [[west, south], [east, north]]
}

// Major cities by country
export const MAJOR_CITIES: Record<string, CityData[]> = {
  USA: [
    {
      name: "New York City",
      country: "United States",
      countryCode: "USA",
      coordinates: [-74.0060, 40.7128],
      population: 8336817,
      zoomLevel: 11,
      boundingBox: [[-74.2591, 40.4774], [-73.7004, 40.9176]]
    },
    {
      name: "Los Angeles",
      country: "United States",
      countryCode: "USA",
      coordinates: [-118.2437, 34.0522],
      population: 3979576,
      zoomLevel: 10,
      boundingBox: [[-118.6682, 33.7037], [-118.1553, 34.3373]]
    },
    {
      name: "Chicago",
      country: "United States",
      countryCode: "USA",
      coordinates: [-87.6298, 41.8781],
      population: 2693976,
      zoomLevel: 11,
      boundingBox: [[-87.9401, 41.6445], [-87.5240, 42.0230]]
    },
    {
      name: "San Francisco",
      country: "United States",
      countryCode: "USA",
      coordinates: [-122.4194, 37.7749],
      population: 873965,
      zoomLevel: 12,
      boundingBox: [[-122.5278, 37.6398], [-122.3481, 37.8324]]
    }
  ],
  GBR: [
    {
      name: "London",
      country: "United Kingdom",
      countryCode: "GBR",
      coordinates: [-0.1276, 51.5074],
      population: 9002488,
      zoomLevel: 10,
      boundingBox: [[-0.5103, 51.2868], [0.3340, 51.6919]]
    },
    {
      name: "Manchester",
      country: "United Kingdom",
      countryCode: "GBR",
      coordinates: [-2.2426, 53.4808],
      population: 547627,
      zoomLevel: 11
    },
    {
      name: "Birmingham",
      country: "United Kingdom",
      countryCode: "GBR",
      coordinates: [-1.8904, 52.4862],
      population: 1141816,
      zoomLevel: 11
    }
  ],
  FRA: [
    {
      name: "Paris",
      country: "France",
      countryCode: "FRA",
      coordinates: [2.3522, 48.8566],
      population: 2161000,
      zoomLevel: 11,
      boundingBox: [[2.2242, 48.8155], [2.4697, 48.9022]]
    },
    {
      name: "Lyon",
      country: "France",
      countryCode: "FRA",
      coordinates: [4.8357, 45.7640],
      population: 513275,
      zoomLevel: 12
    },
    {
      name: "Marseille",
      country: "France",
      countryCode: "FRA",
      coordinates: [5.3698, 43.2965],
      population: 861635,
      zoomLevel: 11
    }
  ],
  DEU: [
    {
      name: "Berlin",
      country: "Germany",
      countryCode: "DEU",
      coordinates: [13.4050, 52.5200],
      population: 3769495,
      zoomLevel: 10,
      boundingBox: [[13.0883, 52.3382], [13.7612, 52.6755]]
    },
    {
      name: "Munich",
      country: "Germany",
      countryCode: "DEU",
      coordinates: [11.5820, 48.1351],
      population: 1471508,
      zoomLevel: 11
    },
    {
      name: "Hamburg",
      country: "Germany",
      countryCode: "DEU",
      coordinates: [9.9937, 53.5511],
      population: 1899160,
      zoomLevel: 11
    }
  ],
  JPN: [
    {
      name: "Tokyo",
      country: "Japan",
      countryCode: "JPN",
      coordinates: [139.6503, 35.6762],
      population: 13960000,
      zoomLevel: 10,
      boundingBox: [[139.0292, 35.3017], [140.1602, 35.8983]]
    },
    {
      name: "Osaka",
      country: "Japan",
      countryCode: "JPN",
      coordinates: [135.5022, 34.6937],
      population: 2725006,
      zoomLevel: 11
    },
    {
      name: "Kyoto",
      country: "Japan",
      countryCode: "JPN",
      coordinates: [135.7681, 35.0116],
      population: 1474570,
      zoomLevel: 11
    }
  ],
  CHN: [
    {
      name: "Beijing",
      country: "China",
      countryCode: "CHN",
      coordinates: [116.4074, 39.9042],
      population: 21540000,
      zoomLevel: 9,
      boundingBox: [[115.4234, 39.4427], [117.5146, 40.2515]]
    },
    {
      name: "Shanghai",
      country: "China",
      countryCode: "CHN",
      coordinates: [121.4737, 31.2304],
      population: 24870000,
      zoomLevel: 9,
      boundingBox: [[120.8522, 30.6637], [122.1188, 31.8983]]
    },
    {
      name: "Shenzhen",
      country: "China",
      countryCode: "CHN",
      coordinates: [114.0579, 22.5431],
      population: 12590000,
      zoomLevel: 10
    }
  ],
  IND: [
    {
      name: "Mumbai",
      country: "India",
      countryCode: "IND",
      coordinates: [72.8777, 19.0760],
      population: 20411000,
      zoomLevel: 10,
      boundingBox: [[72.7765, 18.8928], [73.0948, 19.2705]]
    },
    {
      name: "Delhi",
      country: "India",
      countryCode: "IND",
      coordinates: [77.1025, 28.7041],
      population: 32065000,
      zoomLevel: 10,
      boundingBox: [[76.8390, 28.4041], [77.3467, 28.8837]]
    },
    {
      name: "Bangalore",
      country: "India",
      countryCode: "IND",
      coordinates: [77.5946, 12.9716],
      population: 12425000,
      zoomLevel: 10
    }
  ],
  BRA: [
    {
      name: "São Paulo",
      country: "Brazil",
      countryCode: "BRA",
      coordinates: [-46.6333, -23.5505],
      population: 22043000,
      zoomLevel: 10,
      boundingBox: [[-46.8260, -23.7874], [-46.3651, -23.3574]]
    },
    {
      name: "Rio de Janeiro",
      country: "Brazil",
      countryCode: "BRA",
      coordinates: [-43.1729, -22.9068],
      population: 13458000,
      zoomLevel: 10,
      boundingBox: [[-43.7965, -23.0828], [-43.0990, -22.7461]]
    },
    {
      name: "Brasília",
      country: "Brazil",
      countryCode: "BRA",
      coordinates: [-47.8825, -15.7942],
      population: 3055000,
      zoomLevel: 11
    }
  ],
  AUS: [
    {
      name: "Sydney",
      country: "Australia",
      countryCode: "AUS",
      coordinates: [151.2093, -33.8688],
      population: 5312000,
      zoomLevel: 10,
      boundingBox: [[150.5209, -34.1692], [151.3430, -33.5781]]
    },
    {
      name: "Melbourne",
      country: "Australia",
      countryCode: "AUS",
      coordinates: [144.9631, -37.8136],
      population: 5078000,
      zoomLevel: 10,
      boundingBox: [[144.5938, -38.2607], [145.5125, -37.5113]]
    },
    {
      name: "Brisbane",
      country: "Australia",
      countryCode: "AUS",
      coordinates: [153.0251, -27.4698],
      population: 2560000,
      zoomLevel: 10
    }
  ],
  CAN: [
    {
      name: "Toronto",
      country: "Canada",
      countryCode: "CAN",
      coordinates: [-79.3832, 43.6532],
      population: 2930000,
      zoomLevel: 10,
      boundingBox: [[-79.6392, 43.5810], [-79.1156, 43.8555]]
    },
    {
      name: "Vancouver",
      country: "Canada",
      countryCode: "CAN",
      coordinates: [-123.1207, 49.2827],
      population: 675000,
      zoomLevel: 11
    },
    {
      name: "Montreal",
      country: "Canada",
      countryCode: "CAN",
      coordinates: [-73.5673, 45.5017],
      population: 1780000,
      zoomLevel: 11
    }
  ]
};

// Helper function to get cities for a country
export function getCitiesForCountry(countryCode: string): CityData[] {
  return MAJOR_CITIES[countryCode] || [];
}

// Helper function to find city by name
export function findCityByName(cityName: string): CityData | undefined {
  for (const cities of Object.values(MAJOR_CITIES)) {
    const city = cities.find(c => 
      c.name.toLowerCase() === cityName.toLowerCase()
    );
    if (city) return city;
  }
  return undefined;
}

// Helper function to search cities
export function searchCities(query: string): CityData[] {
  const results: CityData[] = [];
  const lowerQuery = query.toLowerCase();
  
  for (const cities of Object.values(MAJOR_CITIES)) {
    results.push(...cities.filter(city => 
      city.name.toLowerCase().includes(lowerQuery) ||
      city.country.toLowerCase().includes(lowerQuery)
    ));
  }
  
  return results;
}