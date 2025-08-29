/**
 * Google Maps Connector
 * Provides location services, directions, and place information
 */

import { 
  BaseConnector, 
  ConnectorContext, 
  ConnectorRequest, 
  ConnectorResponse 
} from '../types';

export interface Location {
  lat: number;
  lng: number;
}

export interface Place {
  placeId: string;
  name: string;
  address: string;
  location: Location;
  types?: string[];
  rating?: number;
  priceLevel?: number;
  openNow?: boolean;
  photos?: Array<{
    reference: string;
    width: number;
    height: number;
  }>;
}

export interface DirectionsResult {
  routes: Array<{
    summary: string;
    distance: {
      text: string;
      value: number;
    };
    duration: {
      text: string;
      value: number;
    };
    steps: Array<{
      instruction: string;
      distance: { text: string; value: number };
      duration: { text: string; value: number };
    }>;
  }>;
}

export class GoogleMapsConnector extends BaseConnector {
  private apiKey?: string;

  constructor() {
    super({
      id: 'google-maps',
      name: 'Google Maps',
      description: 'Access location data, directions, places, and geocoding services',
      icon: 'map-pin',
      category: 'location',
      capabilities: [
        {
          name: 'geocode',
          description: 'Convert address to coordinates',
          inputSchema: {
            type: 'object',
            properties: {
              address: { type: 'string', required: true }
            }
          }
        },
        {
          name: 'reverseGeocode',
          description: 'Convert coordinates to address',
          inputSchema: {
            type: 'object',
            properties: {
              lat: { type: 'number', required: true },
              lng: { type: 'number', required: true }
            }
          }
        },
        {
          name: 'searchPlaces',
          description: 'Search for places nearby',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', required: true },
              location: {
                type: 'object',
                properties: {
                  lat: { type: 'number' },
                  lng: { type: 'number' }
                }
              },
              radius: { type: 'number', default: 5000 }
            }
          }
        },
        {
          name: 'getDirections',
          description: 'Get directions between two points',
          inputSchema: {
            type: 'object',
            properties: {
              origin: { type: 'string', required: true },
              destination: { type: 'string', required: true },
              mode: { 
                type: 'string', 
                enum: ['driving', 'walking', 'bicycling', 'transit'],
                default: 'driving'
              }
            }
          }
        },
        {
          name: 'calculateDistance',
          description: 'Calculate distance between multiple points',
          inputSchema: {
            type: 'object',
            properties: {
              origins: { 
                type: 'array', 
                items: { type: 'string' },
                required: true 
              },
              destinations: { 
                type: 'array', 
                items: { type: 'string' },
                required: true 
              },
              mode: { 
                type: 'string', 
                enum: ['driving', 'walking', 'bicycling', 'transit'],
                default: 'driving'
              }
            }
          }
        },
        {
          name: 'getPlaceDetails',
          description: 'Get detailed information about a specific place',
          inputSchema: {
            type: 'object',
            properties: {
              placeId: { type: 'string', required: true }
            }
          }
        },
        {
          name: 'getCurrentLocation',
          description: 'Get current device location (requires browser permission)',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        }
      ],
      requiredAuth: {
        type: 'api_key',
        // API key would be stored securely in environment variables
      },
      rateLimit: {
        maxRequestsPerMinute: 100,
        maxRequestsPerHour: 1000,
        maxRequestsPerDay: 25000
      }
    });
  }

  async connect(context: ConnectorContext): Promise<void> {
    this.context = context;
    
    // In production, this would come from secure environment variables
    this.apiKey = context.auth?.apiKey || process.env.GOOGLE_MAPS_API_KEY;
    
    if (!this.apiKey) {
      throw new Error('Google Maps API key is required');
    }
  }

  async disconnect(): Promise<void> {
    this.apiKey = undefined;
    this.context = undefined;
  }

  async execute(request: ConnectorRequest): Promise<ConnectorResponse> {
    const startTime = Date.now();
    
    try {
      if (!this.apiKey) {
        throw new Error('Not connected. Please connect to Google Maps first.');
      }

      let data: any;

      switch (request.capability) {
        case 'geocode':
          data = await this.geocode(request.params.address);
          break;
        
        case 'reverseGeocode':
          data = await this.reverseGeocode(
            request.params.lat,
            request.params.lng
          );
          break;
        
        case 'searchPlaces':
          data = await this.searchPlaces({
            query: request.params.query || '',
            location: request.params.location,
            radius: request.params.radius
          });
          break;
        
        case 'getDirections':
          data = await this.getDirections(
            request.params.origin,
            request.params.destination,
            request.params.mode || 'driving'
          );
          break;
        
        case 'calculateDistance':
          data = await this.calculateDistance({
            origins: request.params.origins || [],
            destinations: request.params.destinations || [],
            mode: request.params.mode || 'driving'
          });
          break;
        
        case 'getPlaceDetails':
          data = await this.getPlaceDetails(request.params.placeId);
          break;
        
        case 'getCurrentLocation':
          data = await this.getCurrentLocation();
          break;
        
        default:
          throw new Error(`Unknown capability: ${request.capability}`);
      }

      return {
        success: true,
        data,
        metadata: {
          requestId: `maps-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          duration: Date.now() - startTime
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        metadata: {
          requestId: `maps-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          duration: Date.now() - startTime
        }
      };
    }
  }

  private async geocode(address: string): Promise<{
    formattedAddress: string;
    location: Location;
    placeId: string;
  }> {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.status !== 'OK' || !data.results?.[0]) {
      throw new Error(`No results found for address: ${address}`);
    }

    const result = data.results[0];
    return {
      formattedAddress: result.formatted_address,
      location: result.geometry.location,
      placeId: result.place_id
    };
  }

  private async reverseGeocode(lat: number, lng: number): Promise<{
    formattedAddress: string;
    placeId: string;
    addressComponents: any[];
  }> {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Reverse geocoding failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.status !== 'OK' || !data.results?.[0]) {
      throw new Error(`No address found for coordinates: ${lat}, ${lng}`);
    }

    const result = data.results[0];
    return {
      formattedAddress: result.formatted_address,
      placeId: result.place_id,
      addressComponents: result.address_components
    };
  }

  private async searchPlaces(params: {
    query: string;
    location?: Location;
    radius?: number;
  }): Promise<Place[]> {
    let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(params.query)}&key=${this.apiKey}`;
    
    if (params.location) {
      url += `&location=${params.location.lat},${params.location.lng}`;
      url += `&radius=${params.radius || 5000}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Place search failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`Place search error: ${data.status}`);
    }

    return (data.results || []).map((result: any) => ({
      placeId: result.place_id,
      name: result.name,
      address: result.formatted_address,
      location: result.geometry.location,
      types: result.types,
      rating: result.rating,
      priceLevel: result.price_level,
      openNow: result.opening_hours?.open_now,
      photos: result.photos?.map((photo: any) => ({
        reference: photo.photo_reference,
        width: photo.width,
        height: photo.height
      }))
    }));
  }

  private async getDirections(
    origin: string,
    destination: string,
    mode: string
  ): Promise<DirectionsResult> {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=${mode}&key=${this.apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Directions request failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`Directions error: ${data.status}`);
    }

    return {
      routes: data.routes.map((route: any) => ({
        summary: route.summary,
        distance: route.legs[0].distance,
        duration: route.legs[0].duration,
        steps: route.legs[0].steps.map((step: any) => ({
          instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
          distance: step.distance,
          duration: step.duration
        }))
      }))
    };
  }

  private async calculateDistance(params: {
    origins: string[];
    destinations: string[];
    mode: string;
  }): Promise<{
    distances: Array<{
      origin: string;
      destination: string;
      distance: { text: string; value: number };
      duration: { text: string; value: number };
    }>;
  }> {
    const origins = params.origins.join('|');
    const destinations = params.destinations.join('|');
    
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origins)}&destinations=${encodeURIComponent(destinations)}&mode=${params.mode}&key=${this.apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Distance calculation failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`Distance calculation error: ${data.status}`);
    }

    const distances: any[] = [];
    
    data.rows.forEach((row: any, originIndex: number) => {
      row.elements.forEach((element: any, destIndex: number) => {
        if (element.status === 'OK') {
          distances.push({
            origin: params.origins[originIndex],
            destination: params.destinations[destIndex],
            distance: element.distance,
            duration: element.duration
          });
        }
      });
    });

    return { distances };
  }

  private async getPlaceDetails(placeId: string): Promise<any> {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${this.apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Place details request failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`Place details error: ${data.status}`);
    }

    return data.result;
  }

  private async getCurrentLocation(): Promise<Location> {
    // This would run on the client side
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          let message = 'Failed to get location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location permission denied';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              message = 'Location request timed out';
              break;
          }
          reject(new Error(message));
        }
      );
    });
  }
}