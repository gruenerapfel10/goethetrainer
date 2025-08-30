'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Clock, Target, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = 'force-dynamic';

export default function WritingPage() {
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
          <h2 className="text-3xl font-bold tracking-tight">Writing Practice</h2>
        </div>
        
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="exercises">Exercises</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            {/* Writing Overview */}
            <Card className="bg-gradient-to-br from-purple-600 to-purple-700 dark:from-purple-800 dark:to-purple-900 text-white border-0 shadow-purple-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-white" />
                    <CardTitle className="text-white">Writing Skills</CardTitle>
                  </div>
                  <Button variant="secondary" size="sm" className="bg-white/20 hover:bg-white/30 dark:bg-white/10 dark:hover:bg-white/20 text-white border-0">
                    Start Writing
                  </Button>
                </div>
                <CardDescription className="text-white/80">
                  Improve your German writing composition
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center bg-white/10 rounded-lg p-4 backdrop-blur">
                    <p className="text-3xl font-bold">B1</p>
                    <p className="text-sm text-white/80">Current Level</p>
                  </div>
                  <div className="text-center bg-white/10 rounded-lg p-4 backdrop-blur">
                    <p className="text-3xl font-bold">8</p>
                    <p className="text-sm text-white/80">Essays Written</p>
                  </div>
                  <div className="text-center bg-white/10 rounded-lg p-4 backdrop-blur">
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="h-5 w-5 text-yellow-300" />
                      <p className="text-3xl font-bold">30</p>
                    </div>
                    <p className="text-sm text-white/80">Minutes Today</p>
                  </div>
                  <div className="text-center bg-white/10 rounded-lg p-4 backdrop-blur">
                    <div className="flex items-center justify-center gap-1">
                      <Trophy className="h-5 w-5 text-yellow-300" />
                      <p className="text-3xl font-bold">78%</p>
                    </div>
                    <p className="text-sm text-white/80">Grammar Score</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="backdrop-blur-xl border-0 shadow-blue hover:shadow-blue-lg transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Short Texts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12</div>
                  <p className="text-xs text-muted-foreground">
                    50-100 words
                  </p>
                </CardContent>
              </Card>
              
              <Card className="backdrop-blur-xl border-0 shadow-blue hover:shadow-blue-lg transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Essays</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">5</div>
                  <p className="text-xs text-muted-foreground">
                    200-400 words
                  </p>
                </CardContent>
              </Card>
              
              <Card className="backdrop-blur-xl border-0 shadow-blue hover:shadow-blue-lg transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Letters</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">3</div>
                  <p className="text-xs text-muted-foreground">
                    Formal & Informal
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="exercises" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Writing Exercises</CardTitle>
                <CardDescription>Practice different types of writing tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Writing exercises will be implemented here.</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="progress" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Progress Tracking</CardTitle>
                <CardDescription>Monitor your writing improvement</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Progress tracking will be implemented here.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}