"use client"

import React, { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { 
  Users, 
  UserPlus, 
  Settings, 
  Crown, 
  Eye, 
  Edit, 
  Send,
  Copy,
  CheckCircle,
  Clock,
  XCircle
} from "lucide-react"

interface Workspace {
  id: string
  name: string
  description?: string
  memberships: Array<{
    id: string
    role: string
    user: {
      id: string
      name: string
      email: string
      image?: string
    }
  }>
  _count: {
    nodes: number
    memberships: number
  }
}

interface OnlineUser {
  userId: string
  userName: string
  userAvatar?: string
  isOnline: boolean
  lastSeen: number
}

interface WorkspacePanelProps {
  workspace?: Workspace
  onlineUsers: OnlineUser[]
  onWorkspaceChange?: (workspaceId: string) => void
}

export function WorkspacePanel({ workspace, onlineUsers, onWorkspaceChange }: WorkspacePanelProps) {
  const { data: session } = useSession()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"VIEWER" | "EDITOR" | "OWNER">("VIEWER")
  const [inviteMessage, setInviteMessage] = useState("")
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const fetchWorkspaces = async () => {
    try {
      const response = await fetch("/api/workspaces")
      if (response.ok) {
        const data = await response.json()
        setWorkspaces(data)
      }
    } catch (error) {
      console.error("Failed to fetch workspaces:", error)
    }
  }

  useEffect(() => {
    fetchWorkspaces()
  }, [])

  const handleInviteUser = async () => {
    if (!workspace || !inviteEmail) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/workspaces/invite?id=${workspace.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          message: inviteMessage,
        }),
      })

      if (response.ok) {
        setInviteEmail("")
        setInviteMessage("")
        setIsInviteDialogOpen(false)
        // Refresh workspace data
        fetchWorkspaces()
      } else {
        const error = await response.json()
        alert(error.error || "Failed to send invitation")
      }
    } catch (error) {
      console.error("Failed to send invitation:", error)
      alert("Failed to send invitation")
    } finally {
      setIsLoading(false)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "OWNER":
        return <Crown className="w-3 h-3 text-yellow-500" />
      case "EDITOR":
        return <Edit className="w-3 h-3 text-blue-500" />
      case "VIEWER":
        return <Eye className="w-3 h-3 text-gray-500" />
      default:
        return null
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "OWNER":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "EDITOR":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "VIEWER":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const currentUserMembership = workspace?.memberships.find(
    (m) => m.user.id === session?.user?.id
  )

  const canInvite = currentUserMembership?.role === "OWNER" || currentUserMembership?.role === "EDITOR"

  return (
    <div className="w-80 border-r bg-white dark:bg-gray-900 flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Workspace</h2>
          {canInvite && (
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <UserPlus className="w-4 h-4 mr-1" />
                  Invite
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite User to Workspace</DialogTitle>
                  <DialogDescription>
                    Send an invitation to collaborate on {workspace?.name}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@example.com"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={inviteRole} onValueChange={(value: any) => setInviteRole(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VIEWER">
                          <div className="flex items-center gap-2">
                            <Eye className="w-4 h-4" />
                            Viewer - Can view only
                          </div>
                        </SelectItem>
                        <SelectItem value="EDITOR">
                          <div className="flex items-center gap-2">
                            <Edit className="w-4 h-4" />
                            Editor - Can view and edit
                          </div>
                        </SelectItem>
                        {currentUserMembership?.role === "OWNER" && (
                          <SelectItem value="OWNER">
                            <div className="flex items-center gap-2">
                              <Crown className="w-4 h-4" />
                              Owner - Full access
                            </div>
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Personal Message (Optional)</Label>
                    <Textarea
                      id="message"
                      value={inviteMessage}
                      onChange={(e) => setInviteMessage(e.target.value)}
                      placeholder="Add a personal message to your invitation..."
                      rows={3}
                    />
                  </div>

                  <Button 
                    onClick={handleInviteUser} 
                    disabled={!inviteEmail || isLoading}
                    className="w-full"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {isLoading ? "Sending..." : "Send Invitation"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {workspace && (
          <div className="space-y-2">
            <h3 className="font-medium">{workspace.name}</h3>
            {workspace.description && (
              <p className="text-sm text-gray-600">{workspace.description}</p>
            )}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>{workspace._count.nodes} nodes</span>
              <span>{workspace._count.memberships} members</span>
            </div>
          </div>
        )}
      </div>

      {/* Online Users */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium">
            Online ({onlineUsers.filter(u => u.isOnline).length})
          </span>
        </div>
        
        <div className="space-y-2">
          {onlineUsers
            .filter(user => user.isOnline)
            .map((user) => (
              <div key={user.userId} className="flex items-center gap-2">
                <div className="relative">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={user.userAvatar} />
                    <AvatarFallback className="text-xs">
                      {getInitials(user.userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <span className="text-sm truncate">{user.userName}</span>
              </div>
            ))}
          
          {onlineUsers.filter(u => u.isOnline).length === 0 && (
            <p className="text-xs text-gray-500">No other users online</p>
          )}
        </div>
      </div>

      {/* Workspace Members */}
      <div className="flex-1 p-4 overflow-y-auto">
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Members ({workspace?.memberships.length || 0})
        </h4>
        
        <div className="space-y-2">
          {workspace?.memberships.map((membership) => {
            const isOnline = onlineUsers.some(
              u => u.userId === membership.user.id && u.isOnline
            )
            
            return (
              <div key={membership.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="relative">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={membership.user.image || ""} />
                      <AvatarFallback className="text-xs">
                        {getInitials(membership.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    {isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {membership.user.name}
                      {membership.user.id === session?.user?.id && " (You)"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {membership.user.email}
                    </p>
                  </div>
                </div>
                
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getRoleBadgeColor(membership.role)} flex items-center gap-1`}
                >
                  {getRoleIcon(membership.role)}
                  {membership.role}
                </Badge>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
} 