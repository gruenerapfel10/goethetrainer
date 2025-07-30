"use client"

import { useRef, useEffect, useState, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

interface CountryBoundariesProps {
  zoom: number
  onCountryHover?: (countryName: string | null) => void
  onCountryClick?: (countryName: string, position: THREE.Vector3) => void
  selectedCountry?: string
  hoveredCountry?: string
}

// Convert lat/lng to 3D position on sphere
function latLngToVector3(lat: number, lng: number, radius: number = 6371): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  
  const x = -(radius * Math.sin(phi) * Math.cos(theta))
  const y = radius * Math.cos(phi)
  const z = radius * Math.sin(phi) * Math.sin(theta)
  
  return new THREE.Vector3(x, y, z)
}

export function CountryBoundaries({ 
  zoom, 
  onCountryHover, 
  onCountryClick,
  selectedCountry,
  hoveredCountry 
}: CountryBoundariesProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [geoData, setGeoData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Load GeoJSON data
  useEffect(() => {
    // Using Natural Earth data (simplified for performance)
    // You can also use: https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson
    fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson')
      .then(response => response.json())
      .then(data => {
        setGeoData(data)
        setLoading(false)
      })
      .catch(error => {
        console.error('Error loading country boundaries:', error)
        setLoading(false)
      })
  }, [])

  // Create country meshes from GeoJSON
  const countryMeshes = useMemo(() => {
    if (!geoData || !geoData.features) return []

    const meshes: Array<{
      mesh: THREE.Line | THREE.LineLoop,
      countryName: string,
      properties: any
    }> = []

    geoData.features.forEach((feature: any) => {
      if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
        const countryName = feature.properties.NAME || feature.properties.name
        
        // Handle MultiPolygon
        const polygons = feature.geometry.type === 'MultiPolygon' 
          ? feature.geometry.coordinates 
          : [feature.geometry.coordinates]

        polygons.forEach((polygon: any[]) => {
          const outerRing = polygon[0] // Just use outer ring for now
          
          if (outerRing && outerRing.length > 2) {
            const points: THREE.Vector3[] = []
            
            outerRing.forEach((coord: number[]) => {
              const [lng, lat] = coord
              const point = latLngToVector3(lat, lng, 6371.5) // Slightly above sphere surface
              points.push(point)
            })

            // Create line geometry
            const geometry = new THREE.BufferGeometry().setFromPoints(points)
            
            // Material based on selection state
            const material = new THREE.LineBasicMaterial({
              color: selectedCountry === countryName ? 0xff0000 : 
                     hoveredCountry === countryName ? 0xffff00 : 0x333333,
              linewidth: selectedCountry === countryName ? 3 : 1,
              opacity: zoom > 3 ? 1 : 0.5,
              transparent: true
            })

            const line = new THREE.LineLoop(geometry, material)
            line.userData = { countryName, properties: feature.properties }
            
            meshes.push({
              mesh: line,
              countryName,
              properties: feature.properties
            })
          }
        })
      }
    })

    return meshes
  }, [geoData, selectedCountry, hoveredCountry, zoom])

  // Update materials when selection changes
  useEffect(() => {
    countryMeshes.forEach(({ mesh, countryName }) => {
      const material = mesh.material as THREE.LineBasicMaterial
      material.color.set(
        selectedCountry === countryName ? 0xff0000 : 
        hoveredCountry === countryName ? 0xffff00 : 0x333333
      )
      material.linewidth = selectedCountry === countryName ? 3 : 1
      material.needsUpdate = true
    })
  }, [selectedCountry, hoveredCountry, countryMeshes])

  return (
    <group ref={groupRef}>
      {!loading && countryMeshes.map(({ mesh }, index) => (
        <primitive
          key={index}
          object={mesh}
          onClick={(e: any) => {
            if (onCountryClick && e.object.userData.countryName) {
              e.stopPropagation()
              onCountryClick(e.object.userData.countryName, e.point)
            }
          }}
          onPointerOver={(e: any) => {
            if (onCountryHover && e.object.userData.countryName) {
              e.stopPropagation()
              onCountryHover(e.object.userData.countryName)
              document.body.style.cursor = 'pointer'
            }
          }}
          onPointerOut={(e: any) => {
            if (onCountryHover) {
              e.stopPropagation()
              onCountryHover(null)
              document.body.style.cursor = 'default'
            }
          }}
        />
      ))}
    </group>
  )
} 