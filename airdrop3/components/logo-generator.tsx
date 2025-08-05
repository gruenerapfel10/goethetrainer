"use client"

import { useRef, useCallback, type ReactElement } from "react"
import { toPng, toSvg } from "html-to-image"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { cn } from "@/lib/utils"

interface LogoGeneratorProps {
  title: string
  logoComponent: ReactElement
  previewBgColor: string
  exportBgColor?: string
  fileNamePrefix: string
  exportWidth?: number
  exportHeight?: number
  previewClassName?: string
}

export function LogoGenerator({
  title,
  logoComponent,
  previewBgColor,
  exportBgColor,
  fileNamePrefix,
  exportWidth = 128,
  exportHeight = 128,
  previewClassName = "h-32 w-32",
}: LogoGeneratorProps) {
  const ref = useRef<HTMLDivElement>(null)

  const handleDownloadPng = useCallback(() => {
    if (ref.current === null) return
    toPng(ref.current, {
      cacheBust: true,
      width: exportWidth,
      height: exportHeight,
      pixelRatio: 5,
      backgroundColor: exportBgColor,
    })
      .then((dataUrl) => {
        const link = document.createElement("a")
        link.download = `${fileNamePrefix}.png`
        link.href = dataUrl
        link.click()
      })
      .catch((err) => console.error("Oops, something went wrong!", err))
  }, [ref, exportBgColor, fileNamePrefix, exportWidth, exportHeight])

  const handleDownloadSvg = useCallback(() => {
    if (ref.current === null) return
    const node = ref.current
    const originalBg = node.style.backgroundColor
    node.style.backgroundColor = exportBgColor || "transparent"
    toSvg(node, { cacheBust: true })
      .then((dataUrl) => {
        const link = document.createElement("a")
        link.download = `${fileNamePrefix}.svg`
        link.href = dataUrl
        link.click()
      })
      .catch((err) => console.error("Oops, something went wrong!", err))
      .finally(() => {
        node.style.backgroundColor = originalBg
      })
  }, [ref, exportBgColor, fileNamePrefix, previewBgColor])

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border bg-gray-50/50 p-6">
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      <div
        ref={ref}
        className={cn("flex items-center justify-center p-4", previewClassName)}
        style={{ backgroundColor: previewBgColor }}
      >
        {logoComponent}
      </div>
      <div className="flex gap-2">
        <Button onClick={handleDownloadPng} variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" /> PNG
        </Button>
        <Button onClick={handleDownloadSvg} variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" /> SVG
        </Button>
      </div>
    </div>
  )
}
