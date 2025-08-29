import type { SVGProps } from "react"

export function MuaLogoVertical(props: SVGProps<SVGSVGElement>) {
  const dotRadius = 2.5
  const dotSpacing = 8
  const letterSpacing = 12 // Vertical spacing

  const m = [
    [1, 0, 0, 0, 1],
    [1, 1, 0, 1, 1],
    [1, 0, 1, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
  ]

  const u = [
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ]

  const a = [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
  ]

  const renderLetter = (matrix: number[][], offsetY: number) => {
    return matrix.flatMap((row, y) =>
      row.map((dot, x) =>
        dot ? (
          <circle
            key={`dot-${x}-${y}-${offsetY}`}
            cx={x * dotSpacing + dotRadius}
            cy={offsetY + y * dotSpacing + dotRadius}
            r={dotRadius}
          />
        ) : null,
      ),
    )
  }

  const letterHeight = 4 * dotSpacing + 2 * dotRadius
  const letterWidth = 4 * dotSpacing + 2 * dotRadius
  const uOffsetY = letterHeight + letterSpacing
  const aOffsetY = uOffsetY + letterHeight + letterSpacing
  const totalHeight = aOffsetY + letterHeight

  return (
    <svg viewBox={`0 0 ${letterWidth} ${totalHeight}`} fill="currentColor" {...props}>
      {renderLetter(m, 0)}
      {renderLetter(u, uOffsetY)}
      {renderLetter(a, aOffsetY)}
    </svg>
  )
}
