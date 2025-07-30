import * as THREE from 'three';

// Earth's radius in kilometers
export const EARTH_RADIUS = 6371;

export interface GeoCoordinates {
  lat: number;  // Latitude in degrees (-90 to 90)
  lng: number;  // Longitude in degrees (-180 to 180)
}

// Convert 3D point on sphere to lat/lng
export function cartesianToLatLng(point: THREE.Vector3): GeoCoordinates {
  const normalized = point.clone().normalize();
  
  // Calculate latitude (-90 to 90)
  const lat = Math.asin(normalized.y) * (180 / Math.PI);
  
  // Calculate longitude (-180 to 180)
  // Flip X coordinate to correct the inversion
  const lng = Math.atan2(normalized.z, -normalized.x) * (180 / Math.PI);
  
  return { lat, lng };
}

// Convert lat/lng to 3D point on sphere
export function latLngToCartesian(lat: number, lng: number, radius: number = EARTH_RADIUS): THREE.Vector3 {
  // Convert to radians
  const latRad = lat * (Math.PI / 180);
  const lngRad = lng * (Math.PI / 180);
  
  // Calculate 3D position
  // Flip X coordinate to correct the inversion
  return new THREE.Vector3(
    -radius * Math.cos(latRad) * Math.cos(lngRad),  // Negative X
    radius * Math.sin(latRad),                      // Y stays the same
    radius * Math.cos(latRad) * Math.sin(lngRad)    // Z stays the same
  );
}

// Get center point of a polygon
export function getPolygonCenter(coordinates: number[][]): GeoCoordinates {
  let sumLat = 0;
  let sumLng = 0;
  let count = 0;

  coordinates.forEach(([lng, lat]) => {
    sumLat += lat;
    sumLng += lng;
    count++;
  });

  return {
    lat: sumLat / count,
    lng: sumLng / count
  };
}

// Format coordinates for display
export function formatCoordinates(coords: GeoCoordinates): string {
  const latDir = coords.lat >= 0 ? 'N' : 'S';
  const lngDir = coords.lng >= 0 ? 'E' : 'W';
  
  return `${Math.abs(coords.lat).toFixed(6)}°${latDir}, ${Math.abs(coords.lng).toFixed(6)}°${lngDir}`;
}

// Calculate point on sphere from mouse position and camera
export function getIntersectionPoint(
  mouse: THREE.Vector2,
  camera: THREE.Camera,
  radius: number = EARTH_RADIUS
): THREE.Vector3 | null {
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  
  // Create an invisible sphere for intersection testing
  const sphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), radius);
  
  // Calculate intersection point
  const intersectionPoint = new THREE.Vector3();
  const hit = raycaster.ray.intersectSphere(sphere, intersectionPoint);
  
  return hit ? intersectionPoint : null;
} 