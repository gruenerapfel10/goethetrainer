"use client"

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Palette, Satellite, Map, Globe, Mountain, Cloud } from 'lucide-react'

export interface MapTheme {
  id: string
  name: string
  icon: React.ReactNode
  description: string
  baseStyle: 'satellite' | 'vector' | 'hybrid'
  colors: {
    background: string
    water: string
    land: string
    borders: string
    roads: string
    labels: string
  }
}

export const themes: Record<string, MapTheme> = {
  light: {
    id: 'light',
    name: 'Light',
    icon: <Map className="w-4 h-4" />,
    description: 'Clean and bright map style',
    baseStyle: 'vector',
    colors: {
      background: '#f0f0f0',
      water: '#a0c4e4',
      land: '#e8e8e8',
      borders: '#cccccc',
      roads: '#ffffff',
      labels: '#333333'
    }
  },
  dark: {
    id: 'dark',
    name: 'Dark',
    icon: <Globe className="w-4 h-4" />,
    description: 'Dark theme for reduced eye strain',
    baseStyle: 'vector',
    colors: {
      background: '#1a1a2e',
      water: '#16213e',
      land: '#0f3460',
      borders: '#e94560',
      roads: '#533483',
      labels: '#ffffff'
    }
  },
  satellite: {
    id: 'satellite',
    name: 'Satellite',
    icon: <Satellite className="w-4 h-4" />,
    description: 'Real satellite imagery',
    baseStyle: 'satellite',
    colors: {
      background: '#000000',
      water: '#1e3a5f',
      land: '#2d5016',
      borders: '#ffffff',
      roads: '#ffff00',
      labels: '#ffffff'
    }
  },
  terrain: {
    id: 'terrain',
    name: 'Terrain',
    icon: <Mountain className="w-4 h-4" />,
    description: 'Topographic elevation view',
    baseStyle: 'hybrid',
    colors: {
      background: '#f5f5dc',
      water: '#4682b4',
      land: '#8b7355',
      borders: '#696969',
      roads: '#d2691e',
      labels: '#2f4f4f'
    }
  },
  weather: {
    id: 'weather',
    name: 'Weather',
    icon: <Cloud className="w-4 h-4" />,
    description: 'Weather patterns overlay',
    baseStyle: 'vector',
    colors: {
      background: '#87ceeb',
      water: '#4682b4',
      land: '#98fb98',
      borders: '#483d8b',
      roads: '#ffd700',
      labels: '#000080'
    }
  }
}

interface StyleSelectorProps {
  currentStyle: string
  onStyleChange: (style: string) => void
}

export function StyleSelector({ currentStyle, onStyleChange }: StyleSelectorProps) {
  const currentTheme = themes[currentStyle] || themes.light

  return (
    <div className="absolute top-4 right-4 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            size="default"
            className="min-w-[140px] justify-start gap-2 shadow-lg"
          >
            {currentTheme.icon}
            <span>{currentTheme.name}</span>
            <Palette className="ml-auto h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[220px]">
          <DropdownMenuLabel>Map Styles</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {Object.values(themes).map((theme) => (
            <DropdownMenuItem
              key={theme.id}
              onClick={() => onStyleChange(theme.id)}
              className="cursor-pointer"
            >
              <div className="flex items-start gap-3 w-full">
                <div className="mt-0.5">{theme.icon}</div>
                <div className="flex-1">
                  <div className="font-medium">{theme.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {theme.description}
                  </div>
                </div>
                {currentStyle === theme.id && (
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                )}
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
} 