"use client"

import { useEffect, useState, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useMapStore } from '@/stores/mapStore'

interface TileRendererProps {
  zoom: number
  style: string
  bounds: { north: number; south: number; east: number; west: number } | null
}

interface Tile {
  x: number
  y: number
  z: number
  key: string
}

export function TileRenderer({ zoom, style, bounds }: TileRendererProps) {
  const [visibleTiles, setVisibleTiles] = useState<Tile[]>([])
  const groupRef = useRef<THREE.Group>(null)
  const { addVisibleTile, removeVisibleTile } = useMapStore()

  // Calculate visible tiles based on zoom and bounds
  useEffect(() => {
    const tiles: Tile[] = []
    
    // Limit zoom level for tile calculation to prevent exponential growth
    const effectiveZoom = Math.min(Math.floor(zoom), 5) // Max zoom level 5 for tiles
    const tileCount = Math.pow(2, effectiveZoom)
    
    // Only create tiles that are actually visible (basic culling)
    const maxTiles = 64 // Limit total tiles for performance
    let tileIndex = 0
    
    for (let x = 0; x < tileCount && tileIndex < maxTiles; x++) {
      for (let y = 0; y < tileCount && tileIndex < maxTiles; y++) {
        tiles.push({
          x,
          y,
          z: effectiveZoom,
          key: `${effectiveZoom}-${x}-${y}`
        })
        tileIndex++
      }
    }
    
    setVisibleTiles(tiles)
  }, [zoom, bounds])

  // Manage tile visibility in store
  useEffect(() => {
    visibleTiles.forEach(tile => addVisibleTile(tile.key))
    return () => {
      visibleTiles.forEach(tile => removeVisibleTile(tile.key))
    }
  }, [visibleTiles, addVisibleTile, removeVisibleTile])

  return (
    <group ref={groupRef}>
      {/* Placeholder for tile rendering */}
      {/* In a full implementation, this would render actual tile meshes */}
    </group>
  )
} 