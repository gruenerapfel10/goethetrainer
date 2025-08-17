'use client';

import { redirect } from 'next/navigation';
import React from 'react';
import { useTranslations } from 'next-intl';
// Auth removed - no authentication needed
// import { auth } from '../../(auth)/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDateRangePicker } from "@/components/date-range-picker";
import { Overview } from "@/components/overview";
import { RecentSales } from "@/components/recent-sales";
import { GraduationCap, FileCheck, Clock, XCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  // Auth removed - no authentication needed
  // const session = await auth();

  // No auth checks needed - always show dashboard
  // if (!session?.user) {
  //   redirect('/');
  // }
  // TODO: Implement Firebase admin role check

  const t = useTranslations();

  return (
    <div className="flex-1 relative">
      {/* Background blur effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blur-circle"></div>
        <div className="absolute top-40 -left-40 w-80 h-80 bg-blur-circle-light"></div>
        <div className="absolute bottom-20 right-20 w-72 h-72 bg-blur-circle-light"></div>
      </div>
      
      <div className="relative z-10 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">{t('dashboard.title')}</h2>
          <div className="flex items-center space-x-2">
            <CalendarDateRangePicker />
          </div>
        </div>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{t('dashboard.overview')}</TabsTrigger>
          <TabsTrigger value="analytics">{t('dashboard.analytics')}</TabsTrigger>
          <TabsTrigger value="reports">{t('dashboard.reports')}</TabsTrigger>
          <TabsTrigger value="notifications">{t('dashboard.notifications')}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          {/* University Applications Overview */}
          <Card className="bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 text-white border-0 shadow-blue-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <GraduationCap className="h-5 w-5 text-white" />
                  <CardTitle className="text-white">{t('dashboard.universityApplications')}</CardTitle>
                </div>
                <Link href="/universities">
                  <Button variant="secondary" size="sm" className="bg-white/20 hover:bg-white/30 dark:bg-white/10 dark:hover:bg-white/20 text-white border-0">
                    {t('dashboard.viewAllUniversities')}
                  </Button>
                </Link>
              </div>
              <CardDescription className="text-white/80">
                {t('dashboard.trackApplications')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center bg-white/10 rounded-lg p-4 backdrop-blur">
                  <p className="text-3xl font-bold">500</p>
                  <p className="text-sm text-white/80">{t('dashboard.totalUniversities')}</p>
                </div>
                <div className="text-center bg-white/10 rounded-lg p-4 backdrop-blur">
                  <p className="text-3xl font-bold">0</p>
                  <p className="text-sm text-white/80">{t('dashboard.applied')}</p>
                </div>
                <div className="text-center bg-white/10 rounded-lg p-4 backdrop-blur">
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="h-5 w-5 text-yellow-300" />
                    <p className="text-3xl font-bold">0</p>
                  </div>
                  <p className="text-sm text-white/80">{t('dashboard.pending')}</p>
                </div>
                <div className="text-center bg-white/10 rounded-lg p-4 backdrop-blur">
                  <div className="flex items-center justify-center gap-1">
                    <FileCheck className="h-5 w-5 text-green-300" />
                    <p className="text-3xl font-bold">0</p>
                  </div>
                  <p className="text-sm text-white/80">{t('dashboard.offers')}</p>
                </div>
                <div className="text-center bg-white/10 rounded-lg p-4 backdrop-blur">
                  <div className="flex items-center justify-center gap-1">
                    <XCircle className="h-5 w-5 text-red-300" />
                    <p className="text-3xl font-bold">0</p>
                  </div>
                  <p className="text-sm text-white/80">{t('dashboard.rejections')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="backdrop-blur-xl border-0 shadow-blue hover:shadow-blue-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('dashboard.totalRevenue')}
                </CardTitle>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    className="h-5 w-5"
                  >
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$45,231.89</div>
                <p className="text-xs text-muted-foreground">
                  +20.1% {t('dashboard.fromLastMonth')}
                </p>
              </CardContent>
            </Card>
            <Card className="backdrop-blur-xl border-0 shadow-blue hover:shadow-blue-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('dashboard.subscriptions')}
                </CardTitle>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    className="h-5 w-5"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+2350</div>
                <p className="text-xs text-muted-foreground">
                  +180.1% {t('dashboard.fromLastMonth')}
                </p>
              </CardContent>
            </Card>
            <Card className="backdrop-blur-xl border-0 shadow-blue hover:shadow-blue-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('dashboard.sales')}</CardTitle>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    className="h-5 w-5"
                  >
                    <rect width="20" height="14" x="2" y="5" rx="2" />
                    <path d="M2 10h20" />
                  </svg>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+12,234</div>
                <p className="text-xs text-muted-foreground">
                  +19% {t('dashboard.fromLastMonth')}
                </p>
              </CardContent>
            </Card>
            <Card className="backdrop-blur-xl border-0 shadow-blue hover:shadow-blue-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('dashboard.activeNow')}
                </CardTitle>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    className="h-5 w-5"
                  >
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+573</div>
                <p className="text-xs text-muted-foreground">
                  +201 {t('dashboard.sinceLastHour')}
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4 backdrop-blur-xl border-0 shadow-blue">
              <CardHeader>
                <CardTitle>{t('dashboard.overview')}</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <Overview />
              </CardContent>
            </Card>
            <Card className="col-span-3 backdrop-blur-xl border-0 shadow-blue">
              <CardHeader>
                <CardTitle>{t('dashboard.recentSales')}</CardTitle>
                <CardDescription>
                  {t('dashboard.salesThisMonth')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RecentSales />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}