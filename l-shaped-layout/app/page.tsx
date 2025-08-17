"use client"

import { Search, Home, FolderOpen, Clock, Users, Bell, User, Plus, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"

export default function LShapedLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* L-Shaped Navigation Container */}
      <div className="fixed inset-0 flex">
        {/* Sidebar - Left part of L */}
        <div
          className={`${sidebarOpen ? "w-64" : "w-0"} bg-zinc-950 flex flex-col transition-all duration-300 overflow-hidden`}
        >
          {/* Logo/Brand */}
          <div className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                <span className="text-black font-bold text-sm">v0</span>
              </div>
              <span className="text-white font-medium">Personal</span>
            </div>
          </div>

          {/* New Chat Button */}
          <div className="px-4 pb-4">
            <Button className="w-full justify-start gap-2 bg-zinc-800 hover:bg-zinc-700 text-white border-0">
              <Plus className="w-4 h-4" />
              New Chat
            </Button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 px-4 space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              <Search className="w-4 h-4" />
              Search
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              <FolderOpen className="w-4 h-4" />
              Projects
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              <Clock className="w-4 h-4" />
              Recents
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              <Users className="w-4 h-4" />
              Community
            </Button>
          </nav>

          {/* Recent Projects */}
          <div className="px-4 py-4">
            <h3 className="text-xs font-medium text-zinc-500 mb-3">Recent Projects</h3>
            <div className="space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-start text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white h-8"
              >
                Dashboard Clone
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white h-8"
              >
                Landing Page
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white h-8"
              >
                UI Components
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          <div className="h-16 bg-zinc-950 flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </Button>
              <h1 className="text-white font-medium">Dashboard</h1>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:bg-zinc-800 hover:text-white">
                Feedback
              </Button>
              <Button variant="ghost" size="icon" className="text-zinc-400 hover:bg-zinc-800 hover:text-white">
                <Bell className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-zinc-400 hover:bg-zinc-800 hover:text-white">
                <User className="w-4 h-4" />
              </Button>
              <span className="text-zinc-400 text-sm">18:64</span>
            </div>
          </div>

          <div className="flex-1 relative">
            <div className="absolute inset-0 bottom-4 right-4 bg-zinc-900 rounded-lg overflow-hidden">
              {/* Content Header */}
              <div className="p-8 text-center">
                <h2 className="text-4xl font-bold text-white mb-6">What can I help you build?</h2>

                {/* Search Input */}
                <div className="max-w-2xl mx-auto mb-6">
                  <div className="relative">
                    <Input
                      placeholder="Ask v0 to build..."
                      className="w-full h-12 pl-4 pr-12 text-base bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                    />
                    <Button size="sm" className="absolute right-2 top-2 bg-emerald-600 hover:bg-emerald-700">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap justify-center gap-3 mb-8">
                  <Button
                    variant="outline"
                    className="gap-2 bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  >
                    <Search className="w-4 h-4" />
                    Clone a Screenshot
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  >
                    <FolderOpen className="w-4 h-4" />
                    Import from Figma
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  >
                    <Plus className="w-4 h-4" />
                    Upload a Project
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  >
                    <Home className="w-4 h-4" />
                    Landing Page
                  </Button>
                </div>
              </div>

              {/* Community Section */}
              <div className="px-8 pb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-white">From the Community</h3>
                  <Button variant="ghost" className="text-emerald-400 hover:text-emerald-300 hover:bg-zinc-800">
                    Browse All →
                  </Button>
                </div>
                <p className="text-zinc-400 mb-6">Explore what the community is building with v0.</p>

                {/* Community Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700 hover:border-emerald-500/50 transition-colors cursor-pointer">
                    <div className="aspect-video bg-gradient-to-br from-emerald-500/20 to-blue-500/20 rounded-md mb-3"></div>
                    <h4 className="font-medium text-white mb-1">Dashboard Analytics</h4>
                    <p className="text-sm text-zinc-400">Modern analytics dashboard with charts</p>
                  </div>

                  <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700 hover:border-emerald-500/50 transition-colors cursor-pointer">
                    <div className="aspect-video bg-gradient-to-br from-purple-500/20 to-emerald-500/20 rounded-md mb-3"></div>
                    <h4 className="font-medium text-white mb-1">Landing Page</h4>
                    <p className="text-sm text-zinc-400">Clean landing page with hero section</p>
                  </div>

                  <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700 hover:border-emerald-500/50 transition-colors cursor-pointer">
                    <div className="aspect-video bg-gradient-to-br from-orange-500/20 to-emerald-500/20 rounded-md mb-3"></div>
                    <h4 className="font-medium text-white mb-1">E-commerce Store</h4>
                    <p className="text-sm text-zinc-400">Product catalog with shopping cart</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
