"use client"

import { ArrowRight, Calendar, Mail, Search, Folder, Globe, Map } from "lucide-react"

const features = [
  {
    id: 1,
    title: "AI Meeting Notes",
    subtitle: "Perfect notes every time.",
    description: "Generate comprehensive meeting notes automatically with AI-powered transcription and analysis.",
    icon: Calendar,
    gradient: "from-gray-900 to-gray-800",
    textColor: "text-white",
    iconColor: "text-gray-400"
  },
  {
    id: 2,
    title: "Enterprise Search",
    subtitle: "One search for everything.",
    description: "Find any document, email, or file across all your connected platforms instantly.",
    icon: Search,
    gradient: "from-gray-800 to-gray-900",
    textColor: "text-white",
    iconColor: "text-gray-400",
    mockup: true
  },
  {
    id: 3,
    title: "Projects",
    subtitle: "Keep every plan on track.",
    description: "Organize and manage all your projects with intelligent tracking and collaboration tools.",
    icon: Folder,
    gradient: "from-gray-900 to-black",
    textColor: "text-white",
    iconColor: "text-gray-400",
    mockup: true
  },
  {
    id: 4,
    title: "Notion Mail",
    subtitle: "The inbox that thinks like you.",
    description: "Smart email management powered by AI to organize, prioritize, and respond to messages.",
    icon: Mail,
    gradient: "from-black to-gray-900",
    textColor: "text-white",
    iconColor: "text-gray-400"
  },
  {
    id: 5,
    title: "Business-in-a-box",
    subtitle: "Run your entire company.",
    description: "Complete business management suite with CRM, project management, and analytics.",
    icon: Globe,
    gradient: "from-gray-800 to-black",
    textColor: "text-white",
    iconColor: "text-gray-400",
    mockup: true
  }
]

export function FeaturesShowcase() {
  return (
    <section className="py-24 px-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-16">
        {/* Feature 1 - Large card */}
        <div className="md:col-span-4 bg-blue-600 rounded-3xl p-8 h-80 flex flex-col justify-between group hover:bg-blue-700 transition-colors cursor-pointer">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-6 h-6 text-white/80" />
              <span className="text-lg font-semibold text-white">{features[0].title}</span>
            </div>
            <h3 className="text-4xl font-bold text-white mb-4">
              {features[0].subtitle}
            </h3>
            <p className="text-white/90 text-lg leading-relaxed">
              {features[0].description}
            </p>
          </div>
        </div>

        {/* Feature 2 - Tall card */}
        <div className="md:col-span-2 bg-white rounded-3xl p-8 h-80 flex flex-col justify-between group hover:bg-gray-100 transition-colors cursor-pointer">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Search className="w-6 h-6 text-gray-800" />
              <span className="text-sm font-medium text-gray-800">{features[1].title}</span>
            </div>
            <h3 className="text-2xl font-bold text-black mb-4">
              {features[1].subtitle}
            </h3>
          </div>
          <div className="bg-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Search className="w-4 h-4 text-gray-600" />
              <span className="text-xs text-gray-600">Search results</span>
            </div>
            <div className="space-y-2">
              <div className="bg-gray-300 rounded p-2">
                <div className="text-xs text-gray-800 font-medium">Project Alpha</div>
              </div>
              <div className="bg-gray-300 rounded p-2">
                <div className="text-xs text-gray-800 font-medium">Meeting Notes</div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature 3 - Wide card */}
        <div className="md:col-span-6 bg-black rounded-3xl p-8 h-64 flex items-center justify-between group hover:bg-gray-900 transition-colors cursor-pointer">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <Folder className="w-6 h-6 text-white/80" />
              <span className="text-lg font-semibold text-white">{features[2].title}</span>
            </div>
            <h3 className="text-3xl font-bold text-white mb-4">
              {features[2].subtitle}
            </h3>
            <p className="text-white/90 text-lg">
              {features[2].description}
            </p>
          </div>
          <div className="flex gap-4 ml-8">
            <div className="bg-gray-800/50 rounded-xl p-4 w-32">
              <div className="text-xs font-medium text-white/90 mb-2">Tasks</div>
              <div className="space-y-1">
                <div className="w-full bg-gray-700 h-2 rounded"></div>
                <div className="w-3/4 bg-gray-700 h-2 rounded"></div>
                <div className="w-1/2 bg-gray-700 h-2 rounded"></div>
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 w-32">
              <div className="text-xs font-medium text-white/90 mb-2">Progress</div>
              <div className="space-y-1">
                <div className="w-full bg-gray-600 h-2 rounded"></div>
                <div className="w-2/3 bg-gray-600 h-2 rounded"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature 4 - Medium card */}
        <div className="md:col-span-3 bg-white rounded-3xl p-8 h-72 flex flex-col justify-between group hover:bg-gray-100 transition-colors cursor-pointer">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-6 h-6 text-gray-800" />
              <span className="text-lg font-semibold text-gray-800">{features[3].title}</span>
            </div>
            <h3 className="text-2xl font-bold text-black mb-4">
              {features[3].subtitle}
            </h3>
            <p className="text-gray-600">
              {features[3].description}
            </p>
          </div>
        </div>

        {/* Feature 5 - Medium card */}
        <div className="md:col-span-3 bg-blue-600 rounded-3xl p-8 h-72 flex flex-col justify-between group hover:bg-blue-700 transition-colors cursor-pointer">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Globe className="w-6 h-6 text-white/80" />
              <span className="text-lg font-semibold text-white">{features[4].title}</span>
            </div>
            <h3 className="text-2xl font-bold text-black mb-4">
              {features[4].subtitle}
            </h3>
          </div>
          <div className="bg-blue-700 rounded-xl p-4">
            <div className="text-xs font-medium text-white mb-2">Roadmap</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                <span className="text-xs text-gray-400">Features</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                <span className="text-xs text-gray-400">Improvements</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-4xl font-bold text-white mb-4">
          "Your AI everything app."
        </h2>
      </div>
    </section>
  )
}