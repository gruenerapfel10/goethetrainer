"use client"

import { useEffect, useState, useMemo } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { latLngToCartesian, EARTH_RADIUS } from '../utils/coordinates'
import { CountryBordersCollection, USA_CANADA_BORDERS, loadCountryBorders } from '../data/countryBorders'

interface BorderRendererProps {
  showBorders?: boolean;
  borderColor?: string;
  borderWidth?: number;
  selectedCountry?: string | null;
}

export function BorderRenderer({ 
  showBorders = true, 
  borderColor = '#ffffff',
  borderWidth = 2,
  selectedCountry = null
}: BorderRendererProps) {
  const [borders, setBorders] = useState<CountryBordersCollection>(USA_CANADA_BORDERS)
  const [loading, setLoading] = useState(false)
  
  // Load full border data
  useEffect(() => {
    if (showBorders) {
      setLoading(true)
      loadCountryBorders().then(data => {
        if (data.features.length > 0) {
          setBorders(data)
        }
        setLoading(false)
      })
    }
  }, [showBorders])

  // Convert GeoJSON to 3D lines
  const borderLines = useMemo(() => {
    if (!borders || !showBorders) return []
    
    const lines: THREE.Line[] = []
    
    borders.features.forEach((feature) => {
      const isSelected = selectedCountry === feature.properties.name
      
      if (feature.geometry.type === 'Polygon') {
        // Handle Polygon
        const coordinates = feature.geometry.coordinates as number[][][]
        coordinates.forEach((ring) => {
          if (ring.length < 3) return
          
          const points: THREE.Vector3[] = []
          ring.forEach((coord) => {
            const [lng, lat] = coord
            const point = latLngToCartesian(lat, lng, EARTH_RADIUS + 0.5)
            points.push(point)
          })
          
          const geometry = new THREE.BufferGeometry().setFromPoints(points)
          const material = new THREE.LineBasicMaterial({
            color: isSelected ? '#ff0000' : borderColor,
            linewidth: isSelected ? borderWidth * 2 : borderWidth,
            transparent: true,
            opacity: isSelected ? 1 : 0.6
          })
          
          const line = new THREE.Line(geometry, material)
          line.userData = { 
            countryName: feature.properties.name,
            iso2: feature.properties.iso2,
            iso3: feature.properties.iso3
          }
          
          lines.push(line)
        })
      } else if (feature.geometry.type === 'MultiPolygon') {
        // Handle MultiPolygon
        const coordinates = feature.geometry.coordinates as number[][][][]
        coordinates.forEach((polygon) => {
          polygon.forEach((ring) => {
            if (ring.length < 3) return
            
            const points: THREE.Vector3[] = []
            ring.forEach((coord) => {
              const [lng, lat] = coord
              const point = latLngToCartesian(lat, lng, EARTH_RADIUS + 0.5)
              points.push(point)
            })
            
            const geometry = new THREE.BufferGeometry().setFromPoints(points)
            const material = new THREE.LineBasicMaterial({
              color: isSelected ? '#ff0000' : borderColor,
              linewidth: isSelected ? borderWidth * 2 : borderWidth,
              transparent: true,
              opacity: isSelected ? 1 : 0.6
            })
            
            const line = new THREE.Line(geometry, material)
            line.userData = { 
              countryName: feature.properties.name,
              iso2: feature.properties.iso2,
              iso3: feature.properties.iso3
            }
            
            lines.push(line)
          })
        })
      }
    })
    
    return lines
  }, [borders, showBorders, borderColor, borderWidth, selectedCountry])

  return (
    <group>
      {borderLines.map((line, index) => (
        <primitive key={index} object={line} />
      ))}
      {loading && (
        <mesh position={[0, EARTH_RADIUS * 1.5, 0]}>
          <boxGeometry args={[100, 100, 100]} />
          <meshBasicMaterial color="yellow" />
        </mesh>
      )}
    </group>
  )
} 