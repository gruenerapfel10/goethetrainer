import { Quote } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const testimonials = [
  {
    quote:
      "Goethe made the impossible feel simple. I applied to universities in three different countries from one place. It's a game-changer.",
    name: "Priya Sharma",
    role: "Accepted to University of Toronto",
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    quote:
      "The deadline tracking and unified document system saved me countless hours and so much stress. I can't imagine applying without it.",
    name: "Kenji Tanaka",
    role: "Accepted to ETH Zurich",
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    quote:
      "As a first-generation student, the global application process was daunting. Goethe provided the clarity and tools I needed to succeed.",
    name: "Maria Rodriguez",
    role: "Accepted to Imperial College London",
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    quote:
      "The AI matching feature is incredible. It suggested universities I hadn't even considered, and one of them ended up being my top choice.",
    name: "Leo Chen",
    role: "Accepted to Stanford University",
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    quote:
      "A truly global platform. I managed applications for the US, UK, and Australia all in one dashboard. Unbelievably efficient.",
    name: "Fatima Al-Jamil",
    role: "Accepted to University of Sydney",
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    quote:
      "The interface is so clean and intuitive. It took all the anxiety out of the application process. 10/10 would recommend.",
    name: "David Kim",
    role: "Accepted to KAIST",
    avatar: "/placeholder.svg?height=40&width=40",
  },
]

export function Testimonials() {
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-bold text-white">Trusted by Ambitious Students Worldwide</h2>
          <p className="mt-4 text-lg text-gray-400">
            Don't just take our word for it. Hear from students who turned their global university dreams into reality
            with Goethe.
          </p>
        </div>
      </div>
      <div className="relative mt-16 w-full overflow-hidden">
        <div className="group flex animate-marquee hover:pause">
          {[...testimonials, ...testimonials].map((testimonial, index) => (
            <div
              key={`${testimonial.name}-${index}`}
              className="mx-4 flex w-full max-w-md flex-shrink-0 flex-col justify-between rounded-lg border border-white/10 bg-gray-900/80 p-8 backdrop-blur-sm"
            >
              <Quote className="h-10 w-10 text-blue-500" />
              <blockquote className="mt-4 flex-1 text-lg text-gray-200">"{testimonial.quote}"</blockquote>
              <div className="mt-6 flex items-center gap-4">
                <Avatar>
                  <AvatarImage src={testimonial.avatar || "/placeholder.svg"} />
                  <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-white">{testimonial.name}</p>
                  <p className="text-sm text-gray-400">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-black to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-black to-transparent" />
      </div>
    </section>
  )
}
