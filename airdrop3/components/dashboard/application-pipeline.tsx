import { MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const applications = [
  {
    university: "Stanford University",
    program: "M.S. in Computer Science",
    status: "Awaiting Decision",
    statusColor: "bg-yellow-500",
    deadline: "Dec 15, 2025",
    avatar: "/stanford-logo.png",
  },
  {
    university: "ETH Zurich",
    program: "M.Sc. in Robotics, Systems and Control",
    status: "Offer Received",
    statusColor: "bg-green-500",
    deadline: "N/A",
    avatar: "/eth-zurich-logo.png",
  },
  {
    university: "University of Toronto",
    program: "Master of Information",
    status: "Applying",
    statusColor: "bg-blue-500",
    deadline: "Jan 12, 2026",
    avatar: "/generic-city-skyline-logo.png",
  },
  {
    university: "Imperial College London",
    program: "MSc Advanced Computing",
    status: "Submitted",
    statusColor: "bg-purple-500",
    deadline: "N/A",
    avatar: "/imperial-college-logo.png",
  },
]

export function ApplicationPipeline() {
  return (
    <div className="space-y-4">
      {applications.map((app) => (
        <div
          key={app.university}
          className="flex items-center gap-4 rounded-lg border border-white/10 bg-gray-900/50 p-4 transition-colors hover:bg-gray-800/50"
        >
          <Avatar className="h-12 w-12 border-2 border-gray-700">
            <AvatarImage src={app.avatar || "/placeholder.svg"} />
            <AvatarFallback>{app.university.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold">{app.university}</h3>
            <p className="text-sm text-gray-400">{app.program}</p>
          </div>
          <div className="hidden text-right md:block">
            <p className="text-sm text-gray-400">Deadline</p>
            <p className="font-medium">{app.deadline}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-full ${app.statusColor}`} />
            <span className="text-sm font-medium">{app.status}</span>
          </div>
          <Button variant="ghost" size="icon" className="text-gray-400 hover:bg-gray-700">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </div>
      ))}
    </div>
  )
}
