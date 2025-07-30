"use client"

import { MapboxMap } from "@/components/ui/mapbox"

export default function DashboardPage() {
  return (
    <div className="fixed inset-0 bg-black">
      <MapboxMap />
    </div>
  )
}
