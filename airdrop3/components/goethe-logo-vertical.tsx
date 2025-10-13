import type { SVGProps } from "react"

export function GoetheLogoVertical(props: SVGProps<SVGSVGElement>) {
  // For now, using a simple G logo representation
  // You can replace this with a proper Goethe logo design
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.61 0 3.14-.38 4.5-1.05v-3.13c-1.26.77-2.74 1.18-4.5 1.18-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8v.5h-4v3h7v-3.5C22 6.48 17.52 2 12 2z" />
    </svg>
  )
}