'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { 
  GraduationCap, 
  Calendar,
  Clock,
  FileText,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Target,
  School,
  DollarSign,
  Activity,
  ChevronRight,
  Plus,
  Filter,
  Download,
  Share2,
  Bell
} from 'lucide-react';
import Link from 'next/link';

// Mock data - will be replaced with real data
const mockStats = {
  totalApplications: 12,
  submitted: 3,
  inProgress: 7,
  notStarted: 2,
  acceptances: 1,
  averageProgress: 42,
  documentsUploaded: 18,
  upcomingDeadlines: 4,
  timeSaved: 32,
  scholarshipsTotal: 45000
};

const applicationsByStatus = [
  { name: 'Not Started', value: 2, color: '#94a3b8' },
  { name: 'In Progress', value: 7, color: '#3b82f6' },
  { name: 'Submitted', value: 3, color: '#10b981' },
];

const progressByMonth = [
  { month: 'Sep', applications: 2, completed: 0 },
  { month: 'Oct', applications: 5, completed: 1 },
  { month: 'Nov', applications: 8, completed: 2 },
  { month: 'Dec', applications: 12, completed: 3 },
];

const upcomingDeadlines = [
  { university: 'MIT', type: 'Early Action', date: '2024-11-01', daysLeft: 15 },
  { university: 'Stanford', type: 'Early Decision', date: '2024-11-15', daysLeft: 29 },
  { university: 'Harvard', type: 'Regular Decision', date: '2025-01-01', daysLeft: 76 },
  { university: 'Yale', type: 'Regular Decision', date: '2025-01-02', daysLeft: 77 },
];

const recentActivity = [
  { action: 'Essay uploaded', university: 'MIT', time: '2 hours ago', type: 'document' },
  { action: 'Application started', university: 'UC Berkeley', time: '5 hours ago', type: 'application' },
  { action: 'Recommendation received', university: 'Stanford', time: '1 day ago', type: 'recommendation' },
  { action: 'Application submitted', university: 'Columbia', time: '3 days ago', type: 'submission' },
];

export default function ApplicationsDashboard() {
  const [selectedTimeRange, setSelectedTimeRange] = useState('all');
  const [profileComplete, setProfileComplete] = useState(75);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Application Dashboard</h2>
          <p className="text-muted-foreground">
            Track your college applications and deadlines
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <Bell className="h-4 w-4" />
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button asChild>
            <Link href="/universities">
              <Plus className="mr-2 h-4 w-4" />
              Add University
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      {profileComplete < 100 && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <CardTitle className="text-base">Complete Your Profile</CardTitle>
              </div>
              <Badge variant="secondary">{profileComplete}% Complete</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              A complete profile improves your application matching and unlocks AI assistance
            </p>
            <Button size="sm" asChild>
              <Link href="/dashboard">
                Go to Dashboard
                <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.totalApplications}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Badge variant="outline" className="mr-2">
                {mockStats.submitted} submitted
              </Badge>
              <span>{mockStats.inProgress} in progress</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Progress</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.averageProgress}%</div>
            <Progress value={mockStats.averageProgress} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Deadlines</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.upcomingDeadlines}</div>
            <p className="text-xs text-muted-foreground">
              Next: {upcomingDeadlines[0]?.daysLeft} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Saved</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.timeSaved} hours</div>
            <p className="text-xs text-muted-foreground">
              Through automation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="deadlines">Deadlines</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {/* Application Status Chart */}
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Application Progress</CardTitle>
                <CardDescription>
                  Track your application status over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={progressByMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="applications" 
                      stackId="1"
                      stroke="#3b82f6" 
                      fill="#3b82f6" 
                      fillOpacity={0.6}
                      name="Total Applications"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="completed" 
                      stackId="2"
                      stroke="#10b981" 
                      fill="#10b981"
                      fillOpacity={0.6}
                      name="Submitted"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Status Distribution */}
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Status Distribution</CardTitle>
                <CardDescription>
                  Current application statuses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={applicationsByStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {applicationsByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Your latest application updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`h-2 w-2 rounded-full ${
                        activity.type === 'submission' ? 'bg-green-500' :
                        activity.type === 'document' ? 'bg-blue-500' :
                        activity.type === 'recommendation' ? 'bg-purple-500' :
                        'bg-gray-500'
                      }`} />
                      <div>
                        <p className="text-sm font-medium">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">{activity.university}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deadlines" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Deadlines</CardTitle>
              <CardDescription>
                Don't miss these important dates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingDeadlines.map((deadline, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        deadline.daysLeft <= 7 ? 'bg-red-100' :
                        deadline.daysLeft <= 30 ? 'bg-orange-100' :
                        'bg-green-100'
                      }`}>
                        <Calendar className={`h-5 w-5 ${
                          deadline.daysLeft <= 7 ? 'text-red-600' :
                          deadline.daysLeft <= 30 ? 'text-orange-600' :
                          'text-green-600'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium">{deadline.university}</p>
                        <p className="text-sm text-muted-foreground">{deadline.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{deadline.date}</p>
                      <p className="text-sm text-muted-foreground">{deadline.daysLeft} days left</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Document Vault</CardTitle>
                  <CardDescription>
                    All your application materials in one place
                  </CardDescription>
                </div>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Document management coming soon</p>
                <p className="text-sm mt-2">You'll be able to store transcripts, essays, and recommendations here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
              <CardDescription>
                Complete history of your application journey
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Extended activity list would go here */}
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Full activity timeline coming soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}