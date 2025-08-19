"use client"

import { useMemo } from "react"

interface AsciiArtCardProps {
  title: string
  subtitle: string
  artData: string
  bgColor: string
  textColor: string
  artColor: string
}

const AsciiArt = ({ artData, artColor }: { artData: string; artColor: string }) => {
  const characters = useMemo(() => {
    const lines = artData.trim().split("\n")
    const charArray = lines.map((line) => line.split(""))
    return charArray
  }, [artData])

  return (
    <div className="font-mono text-xs leading-none" aria-hidden="true">
      {characters.map((row, rowIndex) => (
        <div key={rowIndex} className="flex">
          {row.map((char, charIndex) => {
            const isArt = Math.random() > 0.5
            return (
              <span
                key={charIndex}
                className={isArt ? artColor : "opacity-40"}
                style={{
                  opacity: isArt ? 0.2 + Math.random() * 0.8 : 0.1 + Math.random() * 0.3,
                }}
              >
                {char}
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export function AsciiArtCard({ title, subtitle, artData, bgColor, textColor, artColor }: AsciiArtCardProps) {
  return (
    <div
      className={`group relative flex aspect-[3/4] w-full flex-col justify-between overflow-hidden rounded-3xl p-8 ${bgColor} cursor-pointer transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20`}
    >
      <div className="relative z-10">
        <h2 className={`text-3xl font-bold ${textColor}`}>{title}</h2>
        <p className={`mt-4 text-lg ${textColor} opacity-80`}>{subtitle}</p>
      </div>
      <div className="absolute inset-0 z-0 flex items-center justify-center opacity-30 mix-blend-multiply transition-opacity duration-300 group-hover:opacity-40 dark:mix-blend-lighten">
        <div className="scale-150 transform transition-transform duration-300 group-hover:scale-[1.6]">
          <AsciiArt artData={artData} artColor={artColor} />
        </div>
      </div>
    </div>
  )
}
