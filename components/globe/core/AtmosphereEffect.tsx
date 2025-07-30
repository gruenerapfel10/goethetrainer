"use client"

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface AtmosphereEffectProps {
  intensity?: number
  color?: string
}

export function AtmosphereEffect({ intensity = 0.5, color = "#87CEEB" }: AtmosphereEffectProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  const atmosphereGeometry = new THREE.SphereGeometry(6371 * 1.1, 64, 64)
  
  const atmosphereMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: intensity },
      uColor: { value: new THREE.Color(color) }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uIntensity;
      uniform vec3 uColor;
      
      varying vec3 vNormal;
      varying vec3 vPosition;
      
      void main() {
        // Calculate fresnel effect
        vec3 viewDirection = normalize(cameraPosition - vPosition);
        float fresnel = pow(1.0 - abs(dot(vNormal, viewDirection)), 2.0);
        
        // Add some animation
        float pulse = sin(uTime * 0.5) * 0.1 + 0.9;
        
        // Calculate atmosphere glow
        vec3 atmosphereColor = uColor * uIntensity * pulse;
        float alpha = fresnel * uIntensity;
        
        gl_FragColor = vec4(atmosphereColor, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    depthWrite: false
  })

  useFrame((state) => {
    if (meshRef.current && meshRef.current.material) {
      const mat = meshRef.current.material as THREE.ShaderMaterial
      mat.uniforms.uTime.value = state.clock.elapsedTime
      mat.uniforms.uIntensity.value = intensity
      mat.uniforms.uColor.value = new THREE.Color(color)
    }
  })

  return (
    <mesh 
      ref={meshRef} 
      geometry={atmosphereGeometry} 
      material={atmosphereMaterial}
    />
  )
} 