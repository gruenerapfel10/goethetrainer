import { FileText, CheckCircle, AlertTriangle } from "lucide-react"

const timelineEvents = [
  {
    icon: AlertTriangle,
    iconColor: "text-yellow-400",
    title: "Deadline: Stanford Application",
    description: "Final application submission is due in 3 days.",
    time: "Dec 15, 2025",
  },
  {
    icon: CheckCircle,
    iconColor: "text-green-400",
    title: "Offer Received: ETH Zurich",
    description: "Congratulations! You have received an offer.",
    time: "Dec 10, 2025",
  },
  {
    icon: FileText,
    iconColor: "text-blue-400",
    title: "Essay Analysis Complete",
    description: "Your essay for Imperial College has been reviewed.",
    time: "Dec 8, 2025",
  },
  {
    icon: CheckCircle,
    iconColor: "text-purple-400",
    title: "Application Submitted: Imperial",
    description: "Your application was successfully submitted.",
    time: "Dec 1, 2025",
  },
]

export function TimelineFeed() {
  return (
    <div className="rounded-lg border border-white/10 bg-gray-900/50 p-6">
      <div className="relative space-y-8 pl-6">
        <div className="absolute left-[29px] top-2 h-full w-px -translate-x-1/2 bg-white/10" />
        {timelineEvents.map((event, index) => (
          <div key={index} className="relative flex items-start gap-4">
            <div className="z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-800">
              <event.icon className={`h-5 w-5 ${event.iconColor}`} />
            </div>
            <div>
              <h4 className="font-semibold">{event.title}</h4>
              <p className="text-sm text-gray-400">{event.description}</p>
              <p className="mt-1 text-xs text-gray-500">{event.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
