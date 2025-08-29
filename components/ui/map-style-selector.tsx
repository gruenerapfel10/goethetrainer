"use client"

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Map, Palette } from 'lucide-react'

export type MapStyle = 
  | 'Standard'
  | 'Light'
  | 'Dark'
  | 'Streets'
  | 'Outdoors'
  | 'Satellite'
  | 'Satellite Streets'
  | 'Navigation Day'
  | 'Navigation Night'

export const MAP_STYLES: Record<MapStyle, string> = {
  'Standard': 'mapbox://styles/mapbox/standard',
  'Light': 'mapbox://styles/mapbox/light-v11',
  'Dark': 'mapbox://styles/mapbox/dark-v11',
  'Streets': 'mapbox://styles/mapbox/streets-v12',
  'Outdoors': 'mapbox://styles/mapbox/outdoors-v12',
  'Satellite': 'mapbox://styles/mapbox/satellite-v9',
  'Satellite Streets': 'mapbox://styles/mapbox/satellite-streets-v12',
  'Navigation Day': 'mapbox://styles/mapbox/navigation-day-v1',
  'Navigation Night': 'mapbox://styles/mapbox/navigation-night-v1',
}

interface MapStyleSelectorProps {
  currentStyle: MapStyle
  onStyleChange: (style: MapStyle) => void
}

export function MapStyleSelector({ currentStyle, onStyleChange }: MapStyleSelectorProps) {
  return (
    <div className="absolute top-4 right-4 z-10">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="bg-background/80 backdrop-blur-sm">
            <Palette className="h-4 w-4 mr-2" />
            {currentStyle}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {Object.keys(MAP_STYLES).map((style) => (
            <DropdownMenuItem
              key={style}
              onClick={() => onStyleChange(style as MapStyle)}
              className={currentStyle === style ? 'bg-accent' : ''}
            >
              <Map className="h-4 w-4 mr-2" />
              {style}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}