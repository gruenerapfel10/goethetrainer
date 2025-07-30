"use client"

import { useRef, useState } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { EARTH_RADIUS, GeoCoordinates, cartesianToLatLng, getIntersectionPoint } from './utils/coordinates'
import { CoordinateIndicators } from './ui/CoordinateIndicators'
import { BorderRenderer } from './core/BorderRenderer'
import { CountryFills } from './core/CountryFills'
import { getCountryFromCoords, USA_CANADA_BORDERS } from './data/countryBorders'

// Helper component to handle hover detection
function GlobeObject({ onHover }: { onHover: (coords: GeoCoordinates | null, country: string | null) => void }) {
  const { camera } = useThree()
  const sphereRef = useRef<THREE.Mesh>(null)
  
  // Handle hover detection
  useFrame(({ mouse, raycaster }) => {
    if (!sphereRef.current) return
    
    // Update raycaster with current mouse position
    raycaster.setFromCamera(mouse, camera)
    
    // Check for intersection with sphere
    const intersectionPoint = getIntersectionPoint(mouse, camera, EARTH_RADIUS)
    
    if (intersectionPoint) {
      const coords = cartesianToLatLng(intersectionPoint)
      const country = getCountryFromCoords(coords.lat, coords.lng, USA_CANADA_BORDERS)
      onHover(coords, country)
    } else {
      onHover(null, null)
    }
  })

  return (
    <mesh ref={sphereRef}>
      <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
      <meshPhongMaterial 
        color="#1E88E5"
        shininess={10}
        side={THREE.FrontSide}
        opacity={1}
      />
    </mesh>
  )
}

// Enhanced coordinate display component
function EnhancedCoordinateIndicators({ 
  coordinates, 
  country 
}: { 
  coordinates: GeoCoordinates | null; 
  country: string | null 
}) {
  return (
    <>
      <CoordinateIndicators coordinates={coordinates} />
      
      {/* Country name display */}
      {country && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm px-6 py-3 rounded-lg text-white font-medium text-lg">
          {country}
        </div>
      )}
    </>
  )
}

export function GlobeContainer() {
  const [hoverCoordinates, setHoverCoordinates] = useState<GeoCoordinates | null>(null)
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null)
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)

  const handleHover = (coords: GeoCoordinates | null, country: string | null) => {
    setHoverCoordinates(coords)
    setHoveredCountry(country)
  }

  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{
          position: [0, 0, EARTH_RADIUS * 2.5],
          fov: 45,
          near: 1,
          far: EARTH_RADIUS * 10
        }}
        onClick={() => {
          // Select country on click
          if (hoveredCountry) {
            setSelectedCountry(hoveredCountry === selectedCountry ? null : hoveredCountry)
          }
        }}
        gl={{
          antialias: true,
          alpha: false,
          depth: true,
          stencil: false,
          logarithmicDepthBuffer: true // Better depth handling
        }}
      >
        {/* Globe with hover detection */}
        <GlobeObject onHover={handleHover} />

        {/* Country fills with labels */}
        <CountryFills 
          borders={USA_CANADA_BORDERS}
          fillColor="#333333"
          selectedCountry={selectedCountry}
          hoveredCountry={hoveredCountry}
        />

        {/* Country borders */}
        <BorderRenderer 
          showBorders={true}
          borderColor="#ffffff"
          borderWidth={1}
          selectedCountry={selectedCountry}
        />

        {/* Basic lighting */}
        <ambientLight intensity={0.3} /> {/* Increased ambient light */}
        <directionalLight 
          position={[EARTH_RADIUS, EARTH_RADIUS, EARTH_RADIUS/2]} 
          intensity={1.5}
          castShadow
        />
        <directionalLight 
          position={[-EARTH_RADIUS, -EARTH_RADIUS, -EARTH_RADIUS/2]} 
          intensity={0.5} 
        />

        {/* Orbit controls */}
        <OrbitControls
          enableZoom={true}
          enablePan={true}
          enableRotate={true}
          minDistance={EARTH_RADIUS * 1.5}
          maxDistance={EARTH_RADIUS * 4}
          // Maintain reasonable up direction
          minPolarAngle={Math.PI * 0.1}
          maxPolarAngle={Math.PI * 0.9}
        />

        {/* Grid helpers for reference */}
        <gridHelper 
          args={[EARTH_RADIUS * 3, 30]} 
          position={[0, -EARTH_RADIUS * 1.2, 0]}
          rotation={[0, 0, 0]}
        />
      </Canvas>

      {/* Enhanced coordinate indicators with country name */}
      <EnhancedCoordinateIndicators 
        coordinates={hoverCoordinates} 
        country={hoveredCountry} 
      />
      
      {/* Selected country info */}
      {selectedCountry && (
        <div className="absolute right-4 top-4 bg-black/70 backdrop-blur-sm px-4 py-3 rounded-lg text-white">
          <div className="text-sm font-medium text-gray-300">Selected:</div>
          <div className="text-lg font-semibold">{selectedCountry}</div>
        </div>
      )}
    </div>
  )
} 