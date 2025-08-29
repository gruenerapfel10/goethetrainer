'use client';

import { useEffect, useRef } from 'react';
import { mapController } from '@/components/mapbox';
import type { MapStyle } from '@/components/ui/map-style-selector';

interface MapDataStreamHandlerProps {
  dataStream: any[];
  chatId: string;
}

export function MapDataStreamHandler({ dataStream, chatId }: MapDataStreamHandlerProps) {
  const lastProcessedIndex = useRef(-1);

  useEffect(() => {
    if (!dataStream?.length) return;

    // Process only new deltas to avoid reprocessing
    const newDeltas = dataStream.slice(lastProcessedIndex.current + 1);
    
    if (newDeltas.length === 0) return;
    
    lastProcessedIndex.current = dataStream.length - 1;

    // Process each delta
    newDeltas.forEach((delta: any) => {
      console.log('Processing delta:', delta);
      
      if (delta.type === 'map-control' && delta.content) {
        try {
          const { action, data } = JSON.parse(delta.content);
          console.log('Map control action:', action, 'data:', data);
          
          // Add a small delay to ensure map is ready
          setTimeout(() => {
            switch (action) {
              case 'selectCountry':
                if (data.iso && data.center) {
                  console.log('Selecting country:', data.iso, data.center);
                  mapController.selectCountry(data.iso, data.center);
                }
                break;
                
              case 'flyToLocation':
                if (data.longitude !== undefined && data.latitude !== undefined) {
                  console.log('Flying to location:', data.longitude, data.latitude, data.zoom);
                  mapController.flyToLocation(data.longitude, data.latitude, data.zoom || 5);
                }
                break;
                
              case 'setStyle':
                if (data.style) {
                  console.log('Setting map style:', data.style);
                  mapController.setMapStyle(data.style as MapStyle);
                }
                break;
                
              case 'flyToCity':
                if (data.coordinates && data.city) {
                  console.log('Flying to city:', data.city, data.coordinates, data.zoom);
                  mapController.flyToCity(data.coordinates, data.zoom || 12, data.boundingBox);
                  
                  // Add city marker after flying
                  setTimeout(() => {
                    mapController.addCityMarker({
                      name: data.city,
                      coordinates: data.coordinates,
                      country: data.country
                    });
                  }, 3500);
                }
                break;
                
              case 'searchResults':
                // Handle search results if needed in future
                console.log('City search results:', data.results);
                break;
            }
          }, 100);
        } catch (error) {
          console.error('Error parsing map control data:', error);
        }
      }
    });
  }, [dataStream]);

  return null;
}