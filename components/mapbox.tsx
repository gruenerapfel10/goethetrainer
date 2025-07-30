"use client"

import { useEffect, useRef, useState } from 'react'
import mapboxgl, { LngLatLike } from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { MapStyleSelector, MapStyle, MAP_STYLES } from '@/components/ui/map-style-selector'

interface MapboxProps {
  className?: string
}

const worldview_filter = [
  'all',
  ['==', ['get', 'disputed'], 'false'],
  ['any', ['==', 'all', ['get', 'worldview']], ['in', 'US', ['get', 'worldview']]]
];


// --- Helper function to add sources, layers, and event listeners ---
// This function will be called on initial load and after every style change.
const setupMapLayersAndEvents = (
  map: mapboxgl.Map,
  setSelectedCountry: (country: { iso: string, center: LngLatLike } | null) => void,
  setHoveredCountryISO: (iso: string | null) => void,
  selectedCountry: { iso: string, center: LngLatLike } | null
) => {
  // Prevent adding sources/layers if they already exist (e.g., from HMR)
  if (map.getSource('countries')) {
    return;
  }

  // Add the vector source for country boundaries
  map.addSource('countries', {
    type: 'vector',
    url: 'mapbox://mapbox.country-boundaries-v1'
  });

  // Add the base layer for all countries
  map.addLayer({
    id: 'countries-base',
    type: 'fill',
    source: 'countries',
    'source-layer': 'country_boundaries',
    paint: { 'fill-color': 'rgba(255,255,255,0.3)', 'fill-outline-color': 'rgba(0,0,0,0.2)' },
    filter: worldview_filter
  });

  // Add the layer for highlighting countries
  map.addLayer({
    id: 'countries-highlighted',
    type: 'fill',
    source: 'countries',
    'source-layer': 'country_boundaries',
    paint: { 'fill-color': '#d2361e', 'fill-opacity': 0.6 },
    filter: ['in', ['get', 'iso_3166_1_alpha_3'], '']
  });

  // --- Re-attach Event Listeners ---
  map.on('mousemove', 'countries-base', (e) => {
    map.getCanvas().style.cursor = 'pointer';
    const feature = e.features?.[0];
    if (feature?.properties) {
      setHoveredCountryISO(feature.properties.iso_3166_1_alpha_3);
    }
  });

  map.on('mouseleave', 'countries-base', () => {
    map.getCanvas().style.cursor = '';
    setHoveredCountryISO(null);
  });

  map.on('click', 'countries-base', (e) => {
    const feature = e.features?.[0];
    if (feature?.properties) {
      const iso = feature.properties.iso_3166_1_alpha_3;
      if (selectedCountry?.iso === iso) {
        setSelectedCountry(null);
      } else {
        setSelectedCountry({ iso: iso, center: e.lngLat });
      }
    }
  });
};


// Create a global map controller that can be accessed by AI tools
export const mapController = {
  flyToLocation: (longitude: number, latitude: number, zoom: number = 10) => {
    if (window.globalMapInstance) {
      window.globalMapInstance.flyTo({
        center: [longitude, latitude],
        zoom: zoom,
        pitch: 60,
        bearing: 0,
        duration: 3000,
        essential: true,
      });
    }
  },
  setMapStyle: (style: MapStyle) => {
    if (window.globalMapSetStyle) {
      window.globalMapSetStyle(style);
    }
  },
  selectCountry: (iso: string, center: [number, number]) => {
    if (window.globalMapSelectCountry) {
      window.globalMapSelectCountry({ iso, center });
    }
  }
};

// Extend window interface
declare global {
  interface Window {
    globalMapInstance: mapboxgl.Map | null;
    globalMapSetStyle: ((style: MapStyle) => void) | null;
    globalMapSelectCountry: ((country: { iso: string, center: LngLatLike }) => void) | null;
  }
}

export function MapboxMap({ className = "" }: MapboxProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const animationFrameId = useRef<number | null>(null)

  const [selectedCountry, setSelectedCountry] = useState<{ iso: string, center: LngLatLike } | null>(null)
  const [hoveredCountryISO, setHoveredCountryISO] = useState<string | null>(null)
  const [currentStyle, setCurrentStyle] = useState<MapStyle>('Standard')
  const [cameraPosition, setCameraPosition] = useState<{ lat: number; lng: number; zoom: number } | null>(null)

  const handleStyleChange = (newStyle: MapStyle) => {
    const map = mapRef.current;
    if (!map) return;

    // Stop any ongoing animation and deselect country before changing style
    setSelectedCountry(null); 
    setCurrentStyle(newStyle);
    map.setStyle(MAP_STYLES[newStyle]);
  };

  // Register global functions whenever they change
  useEffect(() => {
    window.globalMapSetStyle = handleStyleChange;
  }, [handleStyleChange]);

  useEffect(() => {
    window.globalMapSelectCountry = setSelectedCountry;
  }, [setSelectedCountry]);

  // Main effect for map initialization
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!token) {
      console.error('NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is not set. Please add it to your .env.local file.');
      return;
    }

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLES[currentStyle],
      center: [10.4515, 51.1657],
      minZoom: 1,
      zoom: 2
    });

    mapRef.current = map;
    
    // Register global map instance
    window.globalMapInstance = map;
    
    // Setup layers on initial load
    map.on('load', () => {
      setupMapLayersAndEvents(map, setSelectedCountry, setHoveredCountryISO, selectedCountry);
      
      // Set initial camera position
      const center = map.getCenter();
      setCameraPosition({
        lat: center.lat,
        lng: center.lng,
        zoom: map.getZoom()
      });
    });
    
    // **THE FIX**: Setup layers again every time the style changes
    map.on('styledata', () => setupMapLayersAndEvents(map, setSelectedCountry, setHoveredCountryISO, selectedCountry));
    
    // Track camera movement
    map.on('move', () => {
      const center = map.getCenter();
      setCameraPosition({
        lat: center.lat,
        lng: center.lng,
        zoom: map.getZoom()
      });
    });

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      map.remove();
      mapRef.current = null;
      window.globalMapInstance = null;
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  // Effect to manage the highlight filter (no changes needed)
  useEffect(() => {
    const map = mapRef.current;
    // Add guard to ensure the layer exists before trying to set a filter
    if (!map || !map.isStyleLoaded() || !map.getLayer('countries-highlighted')) return;

    const countriesToHighlight = [selectedCountry?.iso, hoveredCountryISO].filter(Boolean);
    
    if (countriesToHighlight.length > 0) {
      map.setFilter('countries-highlighted', ['in', ['get', 'iso_3166_1_alpha_3'], ['literal', countriesToHighlight]]);
    } else {
      map.setFilter('countries-highlighted', ['in', ['get', 'iso_3166_1_alpha_3'], '']);
    }
  }, [selectedCountry, hoveredCountryISO]);

  // Effect to control the orbit animation (no changes needed)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const stopOrbit = () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    };

    if (selectedCountry) {
      stopOrbit();

      const orbit = () => {
        const bearing = map.getBearing() + 0.1;
        map.setBearing(bearing);
        animationFrameId.current = requestAnimationFrame(orbit);
      };

      map.flyTo({
        center: selectedCountry.center,
        zoom: 5,
        pitch: 60,
        bearing: 0,
        duration: 3000,
        essential: true,
      });

      map.once('moveend', () => {
        if (mapRef.current && selectedCountry) {
          animationFrameId.current = requestAnimationFrame(orbit);
        }
      });
    } else {
      stopOrbit();
      map.easeTo({
        pitch: 0,
        bearing: 0,
        duration: 1000
      });
    }

    return stopOrbit;
  }, [selectedCountry]);

  return (
    <div className={`fixed inset-0 bg-black overflow-hidden ${className}`}>
      <MapStyleSelector currentStyle={currentStyle} onStyleChange={handleStyleChange} />
      
      {/* Coordinate Display - Top Center */}
      {cameraPosition && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-background/80 backdrop-blur-sm px-3 py-2 rounded-md border border-border shadow-sm z-10">
          <div className="flex items-center gap-2 text-sm font-mono">
            <span className="text-muted-foreground">Lat:</span>
            <span className="font-medium">{cameraPosition.lat.toFixed(4)}°</span>
            <span className="text-muted-foreground mx-1">|</span>
            <span className="text-muted-foreground">Lng:</span>
            <span className="font-medium">{cameraPosition.lng.toFixed(4)}°</span>
          </div>
        </div>
      )}
      
      {/* Coordinate Display - Right Center */}
      {cameraPosition && (
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-background/80 backdrop-blur-sm px-3 py-4 rounded-md border border-border shadow-sm z-10">
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Zoom:</span>
              <span className="font-medium font-mono">{cameraPosition.zoom.toFixed(1)}</span>
            </div>
            <div className="w-full h-px bg-border" />
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">LAT</span>
                <span className="font-medium font-mono text-xs">{cameraPosition.lat.toFixed(4)}°</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">LNG</span>
                <span className="font-medium font-mono text-xs">{cameraPosition.lng.toFixed(4)}°</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div ref={mapContainerRef} style={{ height: '100%' }} />
    </div>
  );
}
