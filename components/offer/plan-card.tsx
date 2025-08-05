import type { ReactNode } from "react"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PlanCardProps {
  icon: ReactNode
  title: string
  price: string
  period: string
  description: string
  features: string[]
  ctaText: string
  ctaVariant: "default" | "outline"
  isRecommended?: boolean
}

export function PlanCard({
  icon,
  title,
  price,
  period,
  description,
  features,
  ctaText,
  ctaVariant,
  isRecommended = false,
}: PlanCardProps) {
  return (
    <div
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-lg border border-white/10 bg-zinc-900/50 p-8 transition-all duration-300 hover:scale-[1.02] hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10",
        isRecommended && "border-blue-500/30",
      )}
    >
      {isRecommended && (
        <>
          <div className="absolute -top-px left-20 right-20 h-px bg-gradient-to-r from-blue-500/0 via-blue-500/70 to-blue-500/0" />
          <div className="absolute -bottom-px left-20 right-20 h-px bg-gradient-to-r from-blue-500/0 via-blue-500/70 to-blue-500/0" />
          <div className="absolute right-4 top-4 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold">
            RECOMMENDED
          </div>
        </>
      )}
      <div className="mb-6 flex items-center gap-4">
        <div className="text-blue-400">{icon}</div>
        <h3 className="font-mono text-2xl font-bold uppercase tracking-wider">{title}</h3>
      </div>
      <div className="mb-6 flex items-baseline gap-2">
        <span className="text-5xl font-bold">{price}</span>
        <span className="text-zinc-400">{period}</span>
      </div>
      <p className="mb-8 text-zinc-300">{description}</p>
      <ul className="mb-10 flex-1 space-y-3">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-blue-500" />
            <span className="text-zinc-300">{feature}</span>
          </li>
        ))}
      </ul>
      <Button
        size="lg"
        variant={ctaVariant}
        className={cn(
          "w-full py-6 text-lg font-semibold",
          ctaVariant === "default"
            ? "bg-blue-600 text-white hover:bg-blue-500"
            : "border-white/20 bg-transparent hover:bg-white hover:text-black",
        )}
      >
        {ctaText}
      </Button>
    </div>
  )
}