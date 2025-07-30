"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl font-bold mb-2">Welcome to Pacemaker</CardTitle>
          <CardDescription className="text-lg">
            Your productivity companion powered by AI. Explore the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Features</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• AI-powered task management</li>
                <li>• Smart scheduling and reminders</li>
                <li>• Collaborative workspaces</li>
                <li>• Advanced analytics and insights</li>
                <li>• Cross-platform synchronization</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Get Started</h3>
              <p className="text-sm text-muted-foreground">
                Access your personalized dashboard and start boosting your productivity.
              </p>
              <div className="space-y-3">
                <Button asChild className="w-full">
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
