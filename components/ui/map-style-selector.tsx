"use client"

import { Settings } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

// Expanded and corrected list of Mapbox styles
export const MAP_STYLES = {
  'Standard': 'mapbox://styles/mapbox/standard',
  'Streets': 'mapbox://styles/mapbox/streets-v12',
  'Outdoors': 'mapbox://styles/mapbox/outdoors-v12',
  'Light': 'mapbox://styles/mapbox/light-v11',
  'Dark': 'mapbox://styles/mapbox/dark-v11',
  'Satellite': 'mapbox://styles/mapbox/satellite-v9',
  'Satellite Streets': 'mapbox://styles/mapbox/satellite-streets-v12',
  'Navigation Day': 'mapbox://styles/mapbox/navigation-day-v1',
  'Navigation Night': 'mapbox://styles/mapbox/navigation-night-v1',
} as const

export type MapStyle = keyof typeof MAP_STYLES

interface MapStyleSelectorProps {
  currentStyle: MapStyle
  onStyleChange: (style: MapStyle) => void
}

export function MapStyleSelector({ currentStyle, onStyleChange }: MapStyleSelectorProps) {
  return (
    <div className="absolute top-4 right-4 z-10">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-colors">
          <Settings className="w-4 h-4" />
          <span>Map Style</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px] bg-background border-border">
          <DropdownMenuLabel>Select Style</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {(Object.keys(MAP_STYLES) as MapStyle[]).map((style) => (
            <DropdownMenuItem
              key={style}
              onClick={() => onStyleChange(style)}
              className={cn(
                "cursor-pointer",
                currentStyle === style && "bg-accent text-accent-foreground"
              )}
            >
              {style}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
