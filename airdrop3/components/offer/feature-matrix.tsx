import { Check, X } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Info } from "lucide-react"

const features = [
  {
    category: "Core Platform",
    items: [
      { name: "University Search & Discovery", explorer: true, navigator: true },
      { name: "Application Dashboard", explorer: true, navigator: true },
      { name: "Community Forum Access", explorer: true, navigator: true },
    ],
  },
  {
    category: "Application Management",
    items: [
      { name: "Managed Applications", explorer: "Up to 3", navigator: "Unlimited" },
      { name: "Deadline Tracking", explorer: false, navigator: true },
      { name: "Unified Document Upload", explorer: false, navigator: true },
    ],
  },
  {
    category: "AI-Powered Tools",
    items: [
      {
        name: "Basic AI Recommendations",
        explorer: true,
        navigator: true,
        tooltip: "Suggests universities based on your academic profile.",
      },
      {
        name: "Advanced AI Matching",
        explorer: false,
        navigator: true,
        tooltip: "In-depth analysis of your profile against university acceptance criteria.",
      },
      {
        name: "AI Essay Analysis",
        explorer: false,
        navigator: true,
        tooltip: "Provides feedback on grammar, tone, and structure for your application essays.",
      },
    ],
  },
  {
    category: "Support",
    items: [
      { name: "Email Support", explorer: false, navigator: true },
      { name: "Priority Queue", explorer: false, navigator: true },
    ],
  },
]

const FeatureCell = ({ value }: { value: boolean | string }) => {
  if (typeof value === "boolean") {
    return value ? <Check className="h-6 w-6 text-blue-500" /> : <X className="h-6 w-6 text-gray-600" />
  }
  return <span className="text-sm font-medium text-white">{value}</span>
}

export function FeatureMatrix() {
  return (
    <TooltipProvider>
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-12 text-center text-4xl font-bold">Full Spectrum Analysis</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-left">
            <thead>
              <tr>
                <th className="w-1/2 p-4 text-sm font-semibold uppercase text-gray-400">Feature</th>
                <th className="w-1/4 p-4 text-center text-sm font-semibold uppercase text-gray-400">Explorer</th>
                <th className="w-1/4 p-4 text-center text-sm font-semibold uppercase text-gray-400">Navigator</th>
              </tr>
            </thead>
            <tbody>
              {features.map((category) => (
                <>
                  <tr key={category.category}>
                    <td colSpan={3} className="p-4 pt-8">
                      <h3 className="font-mono text-lg font-semibold uppercase tracking-widest text-blue-400">
                        {category.category}
                      </h3>
                    </td>
                  </tr>
                  {category.items.map((item) => (
                    <tr key={item.name} className="border-b border-white/10">
                      <td className="p-4 text-gray-300">
                        <div className="flex items-center gap-2">
                          <span>{item.name}</span>
                          {item.tooltip && (
                            <Tooltip delayDuration={0}>
                              <TooltipTrigger>
                                <Info className="h-4 w-4 text-gray-500" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{item.tooltip}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center">
                          <FeatureCell value={item.explorer} />
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center">
                          <FeatureCell value={item.navigator} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </TooltipProvider>
  )
}
