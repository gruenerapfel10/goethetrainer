import { ApplicationPipeline } from "@/components/dashboard/application-pipeline"
import { TimelineFeed } from "@/components/dashboard/timeline-feed"
import { QuickStats } from "@/components/dashboard/quick-stats"
import { AnimatedSection } from "@/components/landing/animated-section"

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <AnimatedSection>
          <QuickStats />
        </AnimatedSection>
        <AnimatedSection className="mt-8">
          <h2 className="mb-4 font-mono text-xl font-bold uppercase tracking-wider text-blue-400">
            // Application Pipeline
          </h2>
          <ApplicationPipeline />
        </AnimatedSection>
      </div>
      <div className="lg:col-span-1">
        <AnimatedSection>
          <h2 className="mb-4 font-mono text-xl font-bold uppercase tracking-wider text-blue-400">
            // Timeline & Alerts
          </h2>
          <TimelineFeed />
        </AnimatedSection>
      </div>
    </div>
  )
}
