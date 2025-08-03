import type { SVGProps } from "react"

export function MuaLogo(props: SVGProps<SVGSVGElement>) {
  const dotRadius = 2.5
  const dotSpacing = 8
  const letterSpacing = 12

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

  const renderLetter = (matrix: number[][], offsetX: number) => {
    return matrix.flatMap((row, y) =>
      row.map((dot, x) =>
        dot ? (
          <circle
            key={`dot-${x}-${y}-${offsetX}`}
            cx={offsetX + x * dotSpacing + dotRadius}
            cy={y * dotSpacing + dotRadius}
            r={dotRadius}
          />
        ) : null,
      ),
    )
  }

  const letterWidth = 4 * dotSpacing + 2 * dotRadius
  const uOffsetX = letterWidth + letterSpacing
  const aOffsetX = uOffsetX + letterWidth + letterSpacing
  const totalWidth = aOffsetX + letterWidth

  return (
    <svg viewBox={`0 0 ${totalWidth} ${letterWidth}`} fill="currentColor" {...props}>
      {renderLetter(m, 0)}
      {renderLetter(u, uOffsetX)}
      {renderLetter(a, aOffsetX)}
    </svg>
  )
}
