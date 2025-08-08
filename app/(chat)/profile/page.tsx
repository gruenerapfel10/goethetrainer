'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  User, 
  GraduationCap, 
  Calendar, 
  MapPin, 
  Phone, 
  Mail,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Award,
  Activity,
  Globe,
  Home,
  BookOpen,
  Trophy,
  Heart,
  Briefcase,
  Music,
  Palette,
  Target,
  ChevronRight,
  Upload,
  Plus,
  X,
  CheckCircle2,
  Circle,
  Zap
} from 'lucide-react';

// Step components with modern micro-interactions
const steps = [
  { id: 'welcome', title: 'Welcome', icon: Sparkles, color: 'from-purple-500 to-pink-500' },
  { id: 'basics', title: 'Basics', icon: User, color: 'from-blue-500 to-cyan-500' },
  { id: 'academic', title: 'Academic', icon: GraduationCap, color: 'from-green-500 to-emerald-500' },
  { id: 'achievements', title: 'Achievements', icon: Trophy, color: 'from-orange-500 to-red-500' },
  { id: 'activities', title: 'Activities', icon: Heart, color: 'from-pink-500 to-rose-500' },
  { id: 'complete', title: 'Complete', icon: CheckCircle2, color: 'from-violet-500 to-purple-500' }
];

// Activity categories with icons
const activityCategories = [
  { value: 'sports', label: 'Sports', icon: '⚽', color: 'bg-green-100 text-green-700' },
  { value: 'music', label: 'Music', icon: '🎵', color: 'bg-purple-100 text-purple-700' },
  { value: 'volunteer', label: 'Volunteer', icon: '🤝', color: 'bg-blue-100 text-blue-700' },
  { value: 'academic', label: 'Academic', icon: '📚', color: 'bg-orange-100 text-orange-700' },
  { value: 'arts', label: 'Arts', icon: '🎨', color: 'bg-pink-100 text-pink-700' },
  { value: 'leadership', label: 'Leadership', icon: '🏆', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'work', label: 'Work', icon: '💼', color: 'bg-gray-100 text-gray-700' },
  { value: 'other', label: 'Other', icon: '✨', color: 'bg-indigo-100 text-indigo-700' }
];

// Test score types with visual indicators
const testTypes = [
  { value: 'SAT', label: 'SAT', maxScore: 1600, color: 'bg-blue-500' },
  { value: 'ACT', label: 'ACT', maxScore: 36, color: 'bg-green-500' },
  { value: 'TOEFL', label: 'TOEFL', maxScore: 120, color: 'bg-purple-500' },
  { value: 'IELTS', label: 'IELTS', maxScore: 9, color: 'bg-orange-500' }
];

// Type definitions
interface TestScore {
  type: string;
  score: string;
  date: string;
}

interface Activity {
  category: string;
  name: string;
  description: string;
}

interface ProfileData {
  firstName: string;
  lastName: string;
  preferredName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  currentSchool: string;
  graduationYear: number;
  gpa: string;
  gpaScale: string;
  classRank: string;
  classSize: string;
  testScores: TestScore[];
  activities: Activity[];
  achievements: any[];
}

export default function ModernProfilePage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    // Basic Info
    firstName: '',
    lastName: '',
    preferredName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    
    // Academic
    currentSchool: '',
    graduationYear: 2025,
    gpa: '',
    gpaScale: '4.0',
    classRank: '',
    classSize: '',
    
    // Test Scores
    testScores: [],
    
    // Activities
    activities: [],
    
    // Achievements
    achievements: []
  });

  const [hoveredActivity, setHoveredActivity] = useState<number | null>(null);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        setIsAnimating(false);
      }, 300);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep - 1);
        setIsAnimating(false);
      }, 300);
    }
  };

  const calculateProgress = () => {
    const totalFields = 15; // Adjust based on required fields
    let filledFields = 0;
    
    if (profileData.firstName) filledFields++;
    if (profileData.lastName) filledFields++;
    if (profileData.email) filledFields++;
    if (profileData.currentSchool) filledFields++;
    if (profileData.gpa) filledFields++;
    if (profileData.testScores.length > 0) filledFields += 2;
    if (profileData.activities.length > 0) filledFields += 3;
    
    return Math.round((filledFields / totalFields) * 100);
  };

  const addTestScore = () => {
    setProfileData({
      ...profileData,
      testScores: [...profileData.testScores, { type: 'SAT', score: '', date: '' }]
    });
  };

  const addActivity = (category: string) => {
    if (!selectedActivities.includes(category)) {
      setSelectedActivities([...selectedActivities, category]);
      setProfileData({
        ...profileData,
        activities: [...profileData.activities, { category, name: '', description: '' }]
      });
    }
  };

  const CurrentStepIcon = steps[currentStep].icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-300/20 to-pink-300/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-300/20 to-cyan-300/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-orange-300/10 to-red-300/10 rounded-full blur-3xl animate-pulse delay-2000" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
        {/* Modern Header with Glass Effect */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                  Create Your Profile
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Let's make your application stand out ✨
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                  {calculateProgress()}%
                </div>
                <p className="text-sm text-gray-500">Complete</p>
              </div>
            </div>

            {/* Modern Progress Bar */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                {steps.map((step, index) => (
                  <motion.div
                    key={step.id}
                    className="flex items-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <button
                      onClick={() => index <= currentStep && setCurrentStep(index)}
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                        index === currentStep 
                          ? "bg-gradient-to-r " + step.color + " text-white shadow-lg scale-110"
                          : index < currentStep
                          ? "bg-green-500 text-white"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-400"
                      )}
                    >
                      {index < currentStep ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <step.icon className="w-5 h-5" />
                      )}
                    </button>
                    {index < steps.length - 1 && (
                      <div className={cn(
                        "w-full h-1 mx-2 rounded-full transition-all duration-500",
                        index < currentStep
                          ? "bg-gradient-to-r from-green-400 to-green-500"
                          : "bg-gray-200 dark:bg-gray-700"
                      )} />
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content Area with Animations */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-2xl p-8 border border-gray-200/50 dark:border-gray-700/50 shadow-xl"
          >
            {/* Step 0: Welcome */}
            {currentStep === 0 && (
              <div className="text-center py-12">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", duration: 0.5 }}
                  className="w-32 h-32 mx-auto mb-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center"
                >
                  <Sparkles className="w-16 h-16 text-white" />
                </motion.div>
                <h2 className="text-3xl font-bold mb-4">Welcome to MUA! 🎉</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                  Let's build your profile together. This will help us match you with perfect universities and streamline your applications.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto mb-8">
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20"
                  >
                    <Target className="w-8 h-8 text-blue-600 mb-3" />
                    <h3 className="font-semibold mb-2">Smart Matching</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">AI-powered university recommendations</p>
                  </motion.div>
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="p-6 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20"
                  >
                    <Zap className="w-8 h-8 text-green-600 mb-3" />
                    <h3 className="font-semibold mb-2">Auto-Fill</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Save hours on repetitive forms</p>
                  </motion.div>
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="p-6 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20"
                  >
                    <Trophy className="w-8 h-8 text-purple-600 mb-3" />
                    <h3 className="font-semibold mb-2">Track Progress</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Stay on top of deadlines</p>
                  </motion.div>
                </div>
              </div>
            )}

            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold mb-2">Let's start with the basics</h2>
                  <p className="text-gray-600 dark:text-gray-400">We'll use this to personalize your experience</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <motion.div whileHover={{ scale: 1.02 }} className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium flex items-center gap-2">
                      <User className="w-4 h-4 text-purple-500" />
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      value={profileData.firstName}
                      onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                      placeholder="John"
                      className="h-12 text-lg border-gray-200 focus:border-purple-500 transition-colors"
                    />
                  </motion.div>

                  <motion.div whileHover={{ scale: 1.02 }} className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium flex items-center gap-2">
                      <User className="w-4 h-4 text-purple-500" />
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      value={profileData.lastName}
                      onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                      placeholder="Doe"
                      className="h-12 text-lg border-gray-200 focus:border-purple-500 transition-colors"
                    />
                  </motion.div>

                  <motion.div whileHover={{ scale: 1.02 }} className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-500" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                      placeholder="john@example.com"
                      className="h-12 text-lg border-gray-200 focus:border-blue-500 transition-colors"
                    />
                  </motion.div>

                  <motion.div whileHover={{ scale: 1.02 }} className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                      <Phone className="w-4 h-4 text-green-500" />
                      Phone
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                      placeholder="+1 (555) 123-4567"
                      className="h-12 text-lg border-gray-200 focus:border-green-500 transition-colors"
                    />
                  </motion.div>
                </div>

                {/* Fun Preferred Name Section */}
                <motion.div 
                  whileHover={{ scale: 1.01 }}
                  className="p-6 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20"
                >
                  <Label htmlFor="preferredName" className="text-sm font-medium flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    What should we call you?
                  </Label>
                  <Input
                    id="preferredName"
                    value={profileData.preferredName}
                    onChange={(e) => setProfileData({...profileData, preferredName: e.target.value})}
                    placeholder="Your nickname (optional)"
                    className="h-12 text-lg bg-white/80 dark:bg-gray-800/80 border-purple-200 focus:border-purple-500 transition-colors"
                  />
                </motion.div>
              </div>
            )}

            {/* Step 2: Academic Information */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold mb-2">Academic Profile</h2>
                  <p className="text-gray-600 dark:text-gray-400">Your academic achievements matter!</p>
                </div>

                <motion.div 
                  whileHover={{ scale: 1.01 }}
                  className="p-6 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-blue-500" />
                        Current School
                      </Label>
                      <Input
                        value={profileData.currentSchool}
                        onChange={(e) => setProfileData({...profileData, currentSchool: e.target.value})}
                        placeholder="Lincoln High School"
                        className="h-12 text-lg"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-green-500" />
                        Graduation Year
                      </Label>
                      <Select
                        value={profileData.graduationYear.toString()}
                        onValueChange={(value) => setProfileData({...profileData, graduationYear: parseInt(value)})}
                      >
                        <SelectTrigger className="h-12 text-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2024">2024</SelectItem>
                          <SelectItem value="2025">2025</SelectItem>
                          <SelectItem value="2026">2026</SelectItem>
                          <SelectItem value="2027">2027</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </motion.div>

                {/* GPA Section with Visual Indicator */}
                <motion.div 
                  whileHover={{ scale: 1.01 }}
                  className="p-6 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20"
                >
                  <Label className="flex items-center gap-2 mb-4">
                    <Trophy className="w-4 h-4 text-green-500" />
                    GPA
                  </Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      step="0.01"
                      value={profileData.gpa}
                      onChange={(e) => setProfileData({...profileData, gpa: e.target.value})}
                      placeholder="3.85"
                      className="h-12 text-lg w-32"
                    />
                    <span className="text-lg text-gray-600">out of</span>
                    <Select
                      value={profileData.gpaScale}
                      onValueChange={(value) => setProfileData({...profileData, gpaScale: value})}
                    >
                      <SelectTrigger className="h-12 text-lg w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4.0">4.0</SelectItem>
                        <SelectItem value="5.0">5.0</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    {profileData.gpa && (
                      <div className="flex-1">
                        <Progress 
                          value={(parseFloat(profileData.gpa) / parseFloat(profileData.gpaScale)) * 100} 
                          className="h-3"
                        />
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}

            {/* Step 3: Achievements & Test Scores */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold mb-2">Show Your Achievements</h2>
                  <p className="text-gray-600 dark:text-gray-400">Test scores and accomplishments</p>
                </div>

                {/* Test Scores with Visual Cards */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-lg font-semibold flex items-center gap-2">
                      <Award className="w-5 h-5 text-orange-500" />
                      Test Scores
                    </Label>
                    <Button onClick={addTestScore} variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Score
                    </Button>
                  </div>

                  {profileData.testScores.length === 0 ? (
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="p-8 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-center cursor-pointer"
                      onClick={addTestScore}
                    >
                      <Award className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 dark:text-gray-400">Add your test scores</p>
                      <p className="text-sm text-gray-500 mt-2">SAT, ACT, TOEFL, IELTS, etc.</p>
                    </motion.div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {testTypes.map((test) => (
                        <motion.div
                          key={test.value}
                          whileHover={{ scale: 1.02 }}
                          className={cn(
                            "p-6 rounded-xl border-2 cursor-pointer transition-all",
                            profileData.testScores.some(s => s.type === test.value)
                              ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                              : "border-gray-200 dark:border-gray-700"
                          )}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <Badge className={cn("text-white", test.color)}>{test.label}</Badge>
                            {profileData.testScores.some(s => s.type === test.value) && (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            )}
                          </div>
                          <div className="text-2xl font-bold">
                            {profileData.testScores.find(s => s.type === test.value)?.score || '--'} 
                            <span className="text-sm text-gray-500 ml-1">/ {test.maxScore}</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Activities */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold mb-2">Your Activities & Interests</h2>
                  <p className="text-gray-600 dark:text-gray-400">What do you love to do?</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {activityCategories.map((category, index) => (
                    <motion.div
                      key={category.value}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => addActivity(category.value)}
                      className={cn(
                        "p-6 rounded-xl cursor-pointer transition-all border-2",
                        selectedActivities.includes(category.value)
                          ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                      )}
                    >
                      <div className="text-3xl mb-2 text-center">{category.icon}</div>
                      <p className="text-sm font-medium text-center">{category.label}</p>
                      {selectedActivities.includes(category.value) && (
                        <CheckCircle2 className="w-4 h-4 text-purple-500 mx-auto mt-2" />
                      )}
                    </motion.div>
                  ))}
                </div>

                {selectedActivities.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20"
                  >
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                      Great choices! You've selected {selectedActivities.length} activities
                    </p>
                  </motion.div>
                )}
              </div>
            )}

            {/* Step 5: Complete */}
            {currentStep === 5 && (
              <div className="text-center py-12">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", duration: 0.5 }}
                  className="w-32 h-32 mx-auto mb-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center"
                >
                  <CheckCircle2 className="w-16 h-16 text-white" />
                </motion.div>
                <h2 className="text-3xl font-bold mb-4">Profile Complete! 🎊</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                  Awesome! Your profile is ready. Now let's find your dream universities.
                </p>
                <div className="flex gap-4 justify-center">
                  <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                    Browse Universities
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                  <Button size="lg" variant="outline">
                    View Dashboard
                  </Button>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <Button
                onClick={handleBack}
                variant="outline"
                disabled={currentStep === 0}
                className="min-w-[120px]"
              >
                <ArrowLeft className="mr-2 w-4 h-4" />
                Back
              </Button>
              
              <Button
                onClick={handleNext}
                disabled={currentStep === steps.length - 1}
                className="min-w-[120px] bg-gradient-to-r from-purple-600 to-pink-600 text-white"
              >
                {currentStep === steps.length - 2 ? 'Complete' : 'Next'}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}