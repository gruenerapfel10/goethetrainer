"use client"

import { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { themes } from '../ui/StyleSelector'

interface TerrainMeshProps {
  style: string
  wireframe?: boolean
  zoom: number
}

// Free Earth texture URLs (NASA Blue Marble or Natural Earth)
const EARTH_TEXTURES = {
  day: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg',
  night: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_lights_2048.png',
  normal: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_normal_2048.jpg',
  specular: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_specular_2048.jpg',
  // Alternative: NASA Blue Marble
  bluemarble: 'https://eoimages.gsfc.nasa.gov/images/imagerecords/74000/74393/world.topo.200407.3x5400x2700.jpg'
}

export function TerrainMesh({ style, wireframe = false, zoom }: TerrainMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const theme = themes[style] || themes.light
  const [texturesLoaded, setTexturesLoaded] = useState(false)
  
  // Load textures
  const textureLoader = new THREE.TextureLoader()
  const [dayTexture, setDayTexture] = useState<THREE.Texture | null>(null)
  const [nightTexture, setNightTexture] = useState<THREE.Texture | null>(null)
  const [normalTexture, setNormalTexture] = useState<THREE.Texture | null>(null)
  const [specularTexture, setSpecularTexture] = useState<THREE.Texture | null>(null)
  
  useEffect(() => {
    // Load textures based on style
    if (style === 'satellite' || style === 'terrain') {
      textureLoader.load(EARTH_TEXTURES.day, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace
        setDayTexture(texture)
      })
      
      if (style === 'satellite') {
        textureLoader.load(EARTH_TEXTURES.normal, (texture) => {
          setNormalTexture(texture)
        })
        
        textureLoader.load(EARTH_TEXTURES.specular, (texture) => {
          setSpecularTexture(texture)
        })
      }
      
      setTexturesLoaded(true)
    }
  }, [style])
  
  // Create adaptive sphere geometry based on zoom level
  const geometry = useMemo(() => {
    const baseRadius = 6371 // Earth radius in km
    const baseSegments = 32 // Reduced base segments for performance
    // Less aggressive scaling for performance
    const adaptiveSegments = Math.min(128, Math.floor(baseSegments + (zoom * 8)))
    
    return new THREE.SphereGeometry(baseRadius, adaptiveSegments, adaptiveSegments)
  }, [zoom])

  // Create material based on style
  const material = useMemo(() => {
    // Use texture-based material for satellite/terrain styles
    if ((style === 'satellite' || style === 'terrain') && dayTexture) {
      const materialOptions: any = {
        map: dayTexture,
        side: THREE.DoubleSide,
        wireframe: wireframe
      }
      
      if (normalTexture && style === 'satellite') {
        materialOptions.normalMap = normalTexture
        materialOptions.normalScale = new THREE.Vector2(0.5, 0.5)
      }
      
      if (specularTexture && style === 'satellite') {
        materialOptions.specularMap = specularTexture
        materialOptions.specular = new THREE.Color('grey')
        materialOptions.shininess = 10
      }
      
      return new THREE.MeshPhongMaterial(materialOptions)
    }
    
    // Fallback to shader material for vector styles
    const shaderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uZoom: { value: zoom },
        uBaseColor: { value: new THREE.Color(theme.colors.land) },
        uWaterColor: { value: new THREE.Color(theme.colors.water) },
        uBorderColor: { value: new THREE.Color(theme.colors.borders) },
        uLightPosition: { value: new THREE.Vector3(10000, 10000, 5000) }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uBaseColor;
        uniform vec3 uWaterColor;
        uniform vec3 uBorderColor;
        uniform vec3 uLightPosition;
        uniform float uZoom;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;
        
        void main() {
          // Basic lighting
          vec3 lightDir = normalize(uLightPosition - vPosition);
          float diff = max(dot(vNormal, lightDir), 0.0);
          
          // Create continent shapes using UV coordinates
          float continent = 0.0;
          
          // Simple continent shapes based on UV coordinates
          // North America
          if (vUv.x > 0.1 && vUv.x < 0.35 && vUv.y > 0.6 && vUv.y < 0.85) {
            continent = 1.0;
          }
          // South America
          if (vUv.x > 0.2 && vUv.x < 0.35 && vUv.y > 0.2 && vUv.y < 0.5) {
            continent = 1.0;
          }
          // Europe & Africa
          if (vUv.x > 0.45 && vUv.x < 0.6 && vUv.y > 0.2 && vUv.y < 0.8) {
            continent = 1.0;
          }
          // Asia
          if (vUv.x > 0.6 && vUv.x < 0.85 && vUv.y > 0.5 && vUv.y < 0.85) {
            continent = 1.0;
          }
          // Australia
          if (vUv.x > 0.7 && vUv.x < 0.85 && vUv.y > 0.2 && vUv.y < 0.4) {
            continent = 1.0;
          }
          
          vec3 color = mix(uWaterColor, uBaseColor, continent);
          
          // Apply lighting
          color = color * (0.5 + 0.5 * diff);
          
          // Add grid lines for higher zoom levels
          if (uZoom > 5.0) {
            float gridSize = 0.05;
            float gridX = step(0.98, fract(vUv.x / gridSize));
            float gridY = step(0.98, fract(vUv.y / gridSize));
            float grid = max(gridX, gridY);
            color = mix(color, uBorderColor, grid * 0.2);
          }
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      wireframe: wireframe,
      side: THREE.DoubleSide
    })

    return shaderMaterial
  }, [style, wireframe, theme, dayTexture, normalTexture, specularTexture, zoom])

  // Update uniforms less frequently for performance
  useFrame((state) => {
    if (meshRef.current && meshRef.current.material && 'uniforms' in meshRef.current.material) {
      const mat = meshRef.current.material as THREE.ShaderMaterial
      // Update time less frequently
      if (state.clock.elapsedTime % 0.1 < 0.016) {
        mat.uniforms.uTime.value = state.clock.elapsedTime
        mat.uniforms.uZoom.value = zoom
      }
    }
  })

  // Rotate globe more slowly and smoothly
  useFrame((state, delta) => {
    if (meshRef.current && !wireframe) {
      meshRef.current.rotation.y += delta * 0.01 // Reduced rotation speed
    }
  })

  return (
    <mesh 
      ref={meshRef} 
      geometry={geometry} 
      material={material} 
      castShadow={false} 
      receiveShadow={false}
      frustumCulled={true}
    />
  )
} 