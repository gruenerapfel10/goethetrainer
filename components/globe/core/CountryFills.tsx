"use client"

import { useMemo, ReactNode } from 'react'
import * as THREE from 'three'
import { Text } from '@react-three/drei'
import { latLngToCartesian, getPolygonCenter, EARTH_RADIUS } from '../utils/coordinates'
import { CountryBordersCollection } from '../data/countryBorders'

interface CountryFillsProps {
  borders: CountryBordersCollection;
  fillColor?: string;
  selectedCountry?: string | null;
  hoveredCountry?: string | null;
}

// Helper to create curved text that wraps around the globe
function CurvedText({ 
  text, 
  position, 
  fontSize = 0.5,
  color = '#ffffff',
  selected = false 
}: { 
  text: string
  position: THREE.Vector3
  fontSize?: number
  color?: string
  selected?: boolean
}) {
  // Calculate rotation to make text face outward from center
  const direction = position.clone().normalize()
  const quaternion = new THREE.Quaternion()
  quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction)
  
  return (
    <Text
      position={position}
      quaternion={quaternion}
      fontSize={fontSize}
      color={color}
      anchorX="center"
      anchorY="middle"
      outlineWidth={selected ? 0.03 : 0.02}
      outlineColor="#000000"
      renderOrder={10}
    >
      {text}
    </Text>
  )
}

export function CountryFills({ 
  borders, 
  fillColor = '#2a2a2a',
  selectedCountry = null,
  hoveredCountry = null
}: CountryFillsProps) {
  // Create filled shapes for each country
  const countryMeshes = useMemo(() => {
    const meshes: ReactNode[] = []
    
    // Create base sphere first (solid background)
    meshes.push(
      <mesh key="base-sphere">
        <sphereGeometry args={[EARTH_RADIUS * 0.995, 64, 64]} />
        <meshPhongMaterial 
          color="#1a1a1a"
          side={THREE.BackSide}
        />
      </mesh>
    )
    
    // Process each country
    borders.features.forEach((feature, featureIndex) => {
      const isSelected = selectedCountry === feature.properties.name
      const isHovered = hoveredCountry === feature.properties.name
      const countryName = feature.properties.name
      
      // Calculate label position for the country
      let labelPosition: THREE.Vector3 | null = null
      let largestPolygonArea = 0
      
      if (feature.geometry.type === 'Polygon') {
        const coordinates = feature.geometry.coordinates as number[][][]
        
        coordinates.forEach((ring, ringIndex) => {
          if (ring.length < 3) return
          
          // Create vertices for the polygon
          const vertices: THREE.Vector3[] = []
          ring.forEach((coord) => {
            const vertex = latLngToCartesian(
              coord[1] as number, 
              coord[0] as number, 
              EARTH_RADIUS * 0.998
            )
            vertices.push(vertex)
          })
          
          // Create shape using triangulation
          const shape = new THREE.Shape()
          const points2D: THREE.Vector2[] = []
          
          // Project to 2D for triangulation
          vertices.forEach((v, i) => {
            const theta = Math.atan2(v.z, v.x)
            const phi = Math.acos(v.y / v.length())
            points2D.push(new THREE.Vector2(theta, phi))
            
            if (i === 0) shape.moveTo(theta, phi)
            else shape.lineTo(theta, phi)
          })
          shape.closePath()
          
          // Create mesh from vertices
          const geometry = new THREE.BufferGeometry()
          geometry.setFromPoints(vertices)
          
          // Calculate center for label (only for the main polygon)
          if (ringIndex === 0) {
            const center = getPolygonCenter(ring as [number, number][])
            labelPosition = latLngToCartesian(center.lat, center.lng, EARTH_RADIUS * 1.01)
          }
          
          meshes.push(
            <mesh key={`${countryName}-poly-${ringIndex}`} geometry={geometry}>
              <meshPhongMaterial 
                color={isSelected ? '#4a4a4a' : isHovered ? '#3a3a3a' : fillColor}
                side={THREE.DoubleSide}
                flatShading={true}
                transparent={true}
                opacity={0.8}
              />
            </mesh>
          )
        })
      } else if (feature.geometry.type === 'MultiPolygon') {
        const coordinates = feature.geometry.coordinates as number[][][][]
        
        coordinates.forEach((polygon, polyIndex) => {
          polygon.forEach((ring, ringIndex) => {
            if (ring.length < 3) return
            
            // Create vertices for the polygon
            const vertices: THREE.Vector3[] = []
            ring.forEach((coord) => {
              const vertex = latLngToCartesian(
                coord[1] as number, 
                coord[0] as number, 
                EARTH_RADIUS * 0.998
              )
              vertices.push(vertex)
            })
            
            // Create mesh from vertices
            const geometry = new THREE.BufferGeometry()
            geometry.setFromPoints(vertices)
            
            // Calculate area to find largest polygon for label
            if (ringIndex === 0) {
              const area = ring.length // Simple approximation
              if (area > largestPolygonArea) {
                largestPolygonArea = area
                const center = getPolygonCenter(ring as [number, number][])
                labelPosition = latLngToCartesian(center.lat, center.lng, EARTH_RADIUS * 1.01)
              }
            }
            
            meshes.push(
              <mesh key={`${countryName}-multi-${polyIndex}-${ringIndex}`} geometry={geometry}>
                <meshPhongMaterial 
                  color={isSelected ? '#4a4a4a' : isHovered ? '#3a3a3a' : fillColor}
                  side={THREE.DoubleSide}
                  flatShading={true}
                  transparent={true}
                  opacity={0.8}
                />
              </mesh>
            )
          })
        })
      }
      
      // Add label for the country
      if (labelPosition && countryName) {
        meshes.push(
          <CurvedText
            key={`${countryName}-label`}
            text={countryName}
            position={labelPosition}
            fontSize={isSelected ? 0.6 : 0.4}
            color={isSelected ? '#ffffff' : '#cccccc'}
            selected={isSelected}
          />
        )
      }
    })
    
    return meshes
  }, [borders, fillColor, selectedCountry, hoveredCountry])

  return <group>{countryMeshes}</group>
} 