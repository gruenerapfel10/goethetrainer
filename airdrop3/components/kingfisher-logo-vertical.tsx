import type { SVGProps } from "react"

export function KingfisherLogoVertical(props: SVGProps<SVGSVGElement>) {
  // For now, using a simple K logo representation
  // You can replace this with a proper Kingfisher logo design
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M7 4v16h3v-6.5l5 6.5h4l-6-8 5.5-8h-3.5l-5 7V4H7z" />
    </svg>
  )
}