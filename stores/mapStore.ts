import { create } from 'zustand'
import * as THREE from 'three'

interface SelectedCountry {
  code: string
  position: THREE.Vector3
}

interface MapStore {
  // Style management
  currentStyle: string
  setCurrentStyle: (style: string) => void
  
  // Country selection
  selectedCountry: SelectedCountry | null
  setSelectedCountry: (country: SelectedCountry | null) => void
  hoveredCountry: string | null
  setHoveredCountry: (country: string | null) => void
  
  // Zoom management
  currentZoom: number
  setCurrentZoom: (zoom: number) => void
  targetZoom: number
  setTargetZoom: (zoom: number) => void
  
  // Tile management
  visibleTiles: Set<string>
  addVisibleTile: (tileId: string) => void
  removeVisibleTile: (tileId: string) => void
  clearVisibleTiles: () => void
  
  // Loading states
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  loadingProgress: number
  setLoadingProgress: (progress: number) => void
  
  // Camera state
  cameraPosition: THREE.Vector3
  setCameraPosition: (position: THREE.Vector3) => void
  cameraTarget: THREE.Vector3
  setCameraTarget: (target: THREE.Vector3) => void
}

export const useMapStore = create<MapStore>((set) => ({
  // Style management
  currentStyle: 'light',
  setCurrentStyle: (style) => set({ currentStyle: style }),
  
  // Country selection
  selectedCountry: null,
  setSelectedCountry: (country) => set({ selectedCountry: country }),
  hoveredCountry: null,
  setHoveredCountry: (country) => set({ hoveredCountry: country }),
  
  // Zoom management
  currentZoom: 2,
  setCurrentZoom: (zoom) => set({ currentZoom: zoom }),
  targetZoom: 2,
  setTargetZoom: (zoom) => set({ targetZoom: zoom }),
  
  // Tile management
  visibleTiles: new Set(),
  addVisibleTile: (tileId) => set((state) => ({
    visibleTiles: new Set(state.visibleTiles).add(tileId)
  })),
  removeVisibleTile: (tileId) => set((state) => {
    const tiles = new Set(state.visibleTiles)
    tiles.delete(tileId)
    return { visibleTiles: tiles }
  }),
  clearVisibleTiles: () => set({ visibleTiles: new Set() }),
  
  // Loading states
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  loadingProgress: 0,
  setLoadingProgress: (progress) => set({ loadingProgress: progress }),
  
  // Camera state
  cameraPosition: new THREE.Vector3(0, 0, 20000),
  setCameraPosition: (position) => set({ cameraPosition: position }),
  cameraTarget: new THREE.Vector3(0, 0, 0),
  setCameraTarget: (target) => set({ cameraTarget: target }),
})) 