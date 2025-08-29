import { Folder, Target, CheckCircle, Clock } from "lucide-react"

const stats = [
  { icon: Folder, value: "8", label: "Active Applications" },
  { icon: Target, value: "3", label: "Awaiting Decision" },
  { icon: CheckCircle, value: "2", label: "Offers Received" },
  { icon: Clock, value: "4", label: "Deadlines This Month" },
]

export function QuickStats() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-lg border border-white/10 bg-gray-900/50 p-6">
          <div className="flex items-center gap-4">
            <div className="text-blue-400">
              <stat.icon className="h-8 w-8" />
            </div>
            <div>
              <p className="font-mono text-3xl font-bold">{stat.value}</p>
              <p className="text-sm text-gray-400">{stat.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
