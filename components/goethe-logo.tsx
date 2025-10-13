import type { SVGProps } from "react"

export function GoetheLogo(props: SVGProps<SVGSVGElement>) {
  // Simple Goethe text logo
  // You can replace this with a proper Goethe logo design
  return (
    <svg viewBox="0 0 200 40" fill="currentColor" {...props}>
      <text x="0" y="30" fontSize="28" fontWeight="bold" fontFamily="system-ui">
        Goethe
      </text>
    </svg>
  )
}