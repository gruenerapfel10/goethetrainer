import type { SVGProps } from "react"

export function KingfisherLogo(props: SVGProps<SVGSVGElement>) {
  // Simple Kingfisher text logo
  // You can replace this with a proper Kingfisher logo design
  return (
    <svg viewBox="0 0 200 40" fill="currentColor" {...props}>
      <text x="0" y="30" fontSize="28" fontWeight="bold" fontFamily="system-ui">
        Kingfisher
      </text>
    </svg>
  )
}