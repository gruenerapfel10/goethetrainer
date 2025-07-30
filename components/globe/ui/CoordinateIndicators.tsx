"use client"

import { GeoCoordinates } from '../utils/coordinates'

interface CoordinateIndicatorsProps {
  coordinates: GeoCoordinates | null;
}

export function CoordinateIndicators({ coordinates }: CoordinateIndicatorsProps) {
  if (!coordinates) return null;

  return (
    <>
      {/* Top latitude indicator */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full text-white font-mono text-sm">
        {Math.abs(coordinates.lat).toFixed(6)}°{coordinates.lat >= 0 ? 'N' : 'S'}
      </div>

      {/* Side longitude indicator */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full text-white font-mono text-sm rotate-90 origin-right">
        {Math.abs(coordinates.lng).toFixed(6)}°{coordinates.lng >= 0 ? 'E' : 'W'}
      </div>

      {/* Coordinate tooltip near cursor */}
      <div className="absolute left-4 bottom-4 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg text-white font-mono text-sm">
        {Math.abs(coordinates.lat).toFixed(6)}°{coordinates.lat >= 0 ? 'N' : 'S'}, {' '}
        {Math.abs(coordinates.lng).toFixed(6)}°{coordinates.lng >= 0 ? 'E' : 'W'}
      </div>
    </>
  )
} 