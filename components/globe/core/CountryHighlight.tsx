"use client"

import { CountryBoundaries } from './CountryBoundaries'
import * as THREE from 'three'

interface CountryHighlightProps {
  selectedCountry: string | undefined
  hoveredCountry: string | null
  onCountryClick: (countryCode: string, position: THREE.Vector3) => void
  zoom: number
}

export function CountryHighlight({ selectedCountry, hoveredCountry, onCountryClick, zoom }: CountryHighlightProps) {
  return (
    <CountryBoundaries
      zoom={zoom}
      selectedCountry={selectedCountry}
      hoveredCountry={hoveredCountry || undefined}
      onCountryClick={onCountryClick}
      onCountryHover={(country) => {
        // You can add hover handling here if needed
        console.log('Hovering:', country)
      }}
    />
  )
} 