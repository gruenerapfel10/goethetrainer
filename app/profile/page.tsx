'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from 'sonner';
import { useAuth } from '@/context/firebase-auth-context';
import { 
  User, 
  Mail,
  Phone,
  MapPin,
  Calendar,
  GraduationCap,
  Award,
  Settings,
  Bell,
  Shield,
  Globe,
  Save,
  Upload,
  Camera,
  Edit3,
  Plus,
  X,
  BookOpen,
  Target,
  Trophy
} from 'lucide-react';

interface ProfileData {
  // Personal Information
  firstName: string;
  lastName: string;
  preferredName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  nationality: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  
  // Academic Information
  currentSchool: string;
  graduationYear: number;
  gpa: string;
  gpaScale: string;
  classRank: string;
  classSize: string;
  intendedMajor: string;
  secondMajor: string;
  
  // Test Scores
  testScores: {
    type: string;
    score: string;
    date: string;
  }[];
  
  // Activities & Achievements
  activities: {
    name: string;
    category: string;
    description: string;
    yearsParticipated: string;
    hoursPerWeek: string;
    position: string;
  }[];
  
  achievements: {
    title: string;
    description: string;
    date: string;
    type: string;
  }[];
  
  // Preferences
  preferences: {
    notifications: {
      email: boolean;
      sms: boolean;
      deadlineReminders: boolean;
      applicationUpdates: boolean;
    };
    privacy: {
      profileVisibility: string;
      shareDataWithPartners: boolean;
    };
    application: {
      preferredApplicationSeason: string;
      targetCountries: string[];
      budgetRange: string;
    };
  };
}

const testTypes = [
  { value: 'SAT', label: 'SAT', maxScore: 1600 },
  { value: 'ACT', label: 'ACT', maxScore: 36 },
  { value: 'TOEFL', label: 'TOEFL', maxScore: 120 },
  { value: 'IELTS', label: 'IELTS', maxScore: 9 },
  { value: 'AP', label: 'AP Exam', maxScore: 5 },
  { value: 'IB', label: 'IB Diploma', maxScore: 45 },
];

const activityCategories = [
  'Sports', 'Music', 'Volunteer Work', 'Academic Clubs', 'Arts', 
  'Leadership', 'Work Experience', 'Research', 'Other'
];

const achievementTypes = [
  'Academic Award', 'Competition Win', 'Scholarship', 'Publication', 
  'Leadership Position', 'Community Service', 'Athletic Achievement', 'Other'
];

const countries = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 
  'France', 'Netherlands', 'Switzerland', 'Sweden', 'Other'
];

export default function ProfilePage() {
  const t = useTranslations();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('personal');
  
  const [profileData, setProfileData] = useState<ProfileData>({
    // Personal Information
    firstName: '',
    lastName: '',
    preferredName: '',
    email: user?.email || '',
    phone: '',
    dateOfBirth: '',
    nationality: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    },
    
    // Academic Information
    currentSchool: '',
    graduationYear: 2025,
    gpa: '',
    gpaScale: '4.0',
    classRank: '',
    classSize: '',
    intendedMajor: '',
    secondMajor: '',
    
    // Test Scores
    testScores: [],
    
    // Activities & Achievements
    activities: [],
    achievements: [],
    
    // Preferences
    preferences: {
      notifications: {
        email: true,
        sms: false,
        deadlineReminders: true,
        applicationUpdates: true,
      },
      privacy: {
        profileVisibility: 'private',
        shareDataWithPartners: false,
      },
      application: {
        preferredApplicationSeason: 'fall',
        targetCountries: [],
        budgetRange: '',
      },
    },
  });

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Here you would typically save to your backend/database
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const addTestScore = () => {
    setProfileData({
      ...profileData,
      testScores: [...profileData.testScores, { type: 'SAT', score: '', date: '' }]
    });
  };

  const removeTestScore = (index: number) => {
    setProfileData({
      ...profileData,
      testScores: profileData.testScores.filter((_, i) => i !== index)
    });
  };

  const addActivity = () => {
    setProfileData({
      ...profileData,
      activities: [...profileData.activities, { 
        name: '', category: 'Other', description: '', yearsParticipated: '', 
        hoursPerWeek: '', position: '' 
      }]
    });
  };

  const removeActivity = (index: number) => {
    setProfileData({
      ...profileData,
      activities: profileData.activities.filter((_, i) => i !== index)
    });
  };

  const addAchievement = () => {
    setProfileData({
      ...profileData,
      achievements: [...profileData.achievements, { 
        title: '', description: '', date: '', type: 'Other' 
      }]
    });
  };

  const removeAchievement = (index: number) => {
    setProfileData({
      ...profileData,
      achievements: profileData.achievements.filter((_, i) => i !== index)
    });
  };

  const sections = [
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'academic', label: 'Academic', icon: GraduationCap },
    { id: 'tests', label: 'Test Scores', icon: Award },
    { id: 'activities', label: 'Activities', icon: Target },
    { id: 'preferences', label: 'Preferences', icon: Settings },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground mb-2">Profile Settings</h1>
            <p className="text-muted-foreground">Manage your personal information and preferences</p>
          </div>
          <Button onClick={handleSave} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <div className="w-64 flex-shrink-0">
          <Card>
            <CardContent className="p-4">
              <nav className="space-y-2">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeSection === section.id
                          ? 'bg-blue-600/10 text-blue-600 font-medium'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {section.label}
                    </button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Personal Information */}
          {activeSection === 'personal' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>
                    Your basic personal details and contact information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={profileData.firstName}
                        onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                        placeholder="John"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={profileData.lastName}
                        onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                        placeholder="Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="preferredName">Preferred Name (Optional)</Label>
                      <Input
                        id="preferredName"
                        value={profileData.preferredName}
                        onChange={(e) => setProfileData({...profileData, preferredName: e.target.value})}
                        placeholder="Johnny"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                        placeholder="john@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">Date of Birth</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={profileData.dateOfBirth}
                        onChange={(e) => setProfileData({...profileData, dateOfBirth: e.target.value})}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-medium mb-4">Address</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="street">Street Address</Label>
                        <Input
                          id="street"
                          value={profileData.address.street}
                          onChange={(e) => setProfileData({
                            ...profileData, 
                            address: {...profileData.address, street: e.target.value}
                          })}
                          placeholder="123 Main Street"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={profileData.address.city}
                          onChange={(e) => setProfileData({
                            ...profileData, 
                            address: {...profileData.address, city: e.target.value}
                          })}
                          placeholder="New York"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State/Province</Label>
                        <Input
                          id="state"
                          value={profileData.address.state}
                          onChange={(e) => setProfileData({
                            ...profileData, 
                            address: {...profileData.address, state: e.target.value}
                          })}
                          placeholder="NY"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Academic Information */}
          {activeSection === 'academic' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5" />
                    Academic Information
                  </CardTitle>
                  <CardDescription>
                    Your current school and academic performance
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentSchool">Current School</Label>
                      <Input
                        id="currentSchool"
                        value={profileData.currentSchool}
                        onChange={(e) => setProfileData({...profileData, currentSchool: e.target.value})}
                        placeholder="Lincoln High School"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="graduationYear">Graduation Year</Label>
                      <Select
                        value={profileData.graduationYear.toString()}
                        onValueChange={(value) => setProfileData({...profileData, graduationYear: parseInt(value)})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[2024, 2025, 2026, 2027, 2028].map(year => (
                            <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gpa">GPA</Label>
                      <div className="flex gap-2">
                        <Input
                          id="gpa"
                          type="number"
                          step="0.01"
                          value={profileData.gpa}
                          onChange={(e) => setProfileData({...profileData, gpa: e.target.value})}
                          placeholder="3.85"
                          className="flex-1"
                        />
                        <Select
                          value={profileData.gpaScale}
                          onValueChange={(value) => setProfileData({...profileData, gpaScale: value})}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="4.0">4.0</SelectItem>
                            <SelectItem value="5.0">5.0</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="classRank">Class Rank (Optional)</Label>
                      <Input
                        id="classRank"
                        value={profileData.classRank}
                        onChange={(e) => setProfileData({...profileData, classRank: e.target.value})}
                        placeholder="15"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Test Scores */}
          {activeSection === 'tests' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="w-5 h-5" />
                        Test Scores
                      </CardTitle>
                      <CardDescription>
                        Add your standardized test scores
                      </CardDescription>
                    </div>
                    <Button onClick={addTestScore} variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Score
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {profileData.testScores.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                      <Award className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">No test scores added yet</p>
                      <Button onClick={addTestScore} variant="outline" className="mt-3">
                        Add Your First Score
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {profileData.testScores.map((score, index) => (
                        <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                          <Select
                            value={score.type}
                            onValueChange={(value) => {
                              const newScores = [...profileData.testScores];
                              newScores[index].type = value;
                              setProfileData({...profileData, testScores: newScores});
                            }}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {testTypes.map(test => (
                                <SelectItem key={test.value} value={test.value}>{test.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            placeholder="Score"
                            value={score.score}
                            onChange={(e) => {
                              const newScores = [...profileData.testScores];
                              newScores[index].score = e.target.value;
                              setProfileData({...profileData, testScores: newScores});
                            }}
                            className="w-24"
                          />
                          <Input
                            type="date"
                            value={score.date}
                            onChange={(e) => {
                              const newScores = [...profileData.testScores];
                              newScores[index].date = e.target.value;
                              setProfileData({...profileData, testScores: newScores});
                            }}
                            className="w-40"
                          />
                          <Button 
                            onClick={() => removeTestScore(index)} 
                            variant="ghost" 
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Activities */}
          {activeSection === 'activities' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="w-5 h-5" />
                        Activities & Achievements
                      </CardTitle>
                      <CardDescription>
                        Showcase your extracurricular activities and achievements
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={addActivity} variant="outline" size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Activity
                      </Button>
                      <Button onClick={addAchievement} variant="outline" size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Achievement
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Activities Section */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Activities</h3>
                    {profileData.activities.length === 0 ? (
                      <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                        <Target className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600 text-sm">No activities added yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {profileData.activities.map((activity, index) => (
                          <div key={index} className="p-4 border rounded-lg space-y-3">
                            <div className="flex items-center gap-4">
                              <Input
                                placeholder="Activity name"
                                value={activity.name}
                                onChange={(e) => {
                                  const newActivities = [...profileData.activities];
                                  newActivities[index].name = e.target.value;
                                  setProfileData({...profileData, activities: newActivities});
                                }}
                                className="flex-1"
                              />
                              <Select
                                value={activity.category}
                                onValueChange={(value) => {
                                  const newActivities = [...profileData.activities];
                                  newActivities[index].category = value;
                                  setProfileData({...profileData, activities: newActivities});
                                }}
                              >
                                <SelectTrigger className="w-40">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {activityCategories.map(category => (
                                    <SelectItem key={category} value={category}>{category}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button 
                                onClick={() => removeActivity(index)} 
                                variant="ghost" 
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                            <Textarea
                              placeholder="Describe your role and accomplishments..."
                              value={activity.description}
                              onChange={(e) => {
                                const newActivities = [...profileData.activities];
                                newActivities[index].description = e.target.value;
                                setProfileData({...profileData, activities: newActivities});
                              }}
                              className="min-h-[80px]"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Achievements Section */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Achievements</h3>
                    {profileData.achievements.length === 0 ? (
                      <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                        <Trophy className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600 text-sm">No achievements added yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {profileData.achievements.map((achievement, index) => (
                          <div key={index} className="p-4 border rounded-lg space-y-3">
                            <div className="flex items-center gap-4">
                              <Input
                                placeholder="Achievement title"
                                value={achievement.title}
                                onChange={(e) => {
                                  const newAchievements = [...profileData.achievements];
                                  newAchievements[index].title = e.target.value;
                                  setProfileData({...profileData, achievements: newAchievements});
                                }}
                                className="flex-1"
                              />
                              <Select
                                value={achievement.type}
                                onValueChange={(value) => {
                                  const newAchievements = [...profileData.achievements];
                                  newAchievements[index].type = value;
                                  setProfileData({...profileData, achievements: newAchievements});
                                }}
                              >
                                <SelectTrigger className="w-40">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {achievementTypes.map(type => (
                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button 
                                onClick={() => removeAchievement(index)} 
                                variant="ghost" 
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                            <Textarea
                              placeholder="Describe your achievement..."
                              value={achievement.description}
                              onChange={(e) => {
                                const newAchievements = [...profileData.achievements];
                                newAchievements[index].description = e.target.value;
                                setProfileData({...profileData, achievements: newAchievements});
                              }}
                              className="min-h-[60px]"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Preferences */}
          {activeSection === 'preferences' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Notification Preferences
                  </CardTitle>
                  <CardDescription>
                    Choose how you'd like to receive updates
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                    </div>
                    <Switch
                      checked={profileData.preferences.notifications.email}
                      onCheckedChange={(checked) => setProfileData({
                        ...profileData,
                        preferences: {
                          ...profileData.preferences,
                          notifications: {
                            ...profileData.preferences.notifications,
                            email: checked
                          }
                        }
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Deadline Reminders</Label>
                      <p className="text-sm text-muted-foreground">Get reminded about application deadlines</p>
                    </div>
                    <Switch
                      checked={profileData.preferences.notifications.deadlineReminders}
                      onCheckedChange={(checked) => setProfileData({
                        ...profileData,
                        preferences: {
                          ...profileData.preferences,
                          notifications: {
                            ...profileData.preferences.notifications,
                            deadlineReminders: checked
                          }
                        }
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Application Updates</Label>
                      <p className="text-sm text-muted-foreground">Receive updates on your application status</p>
                    </div>
                    <Switch
                      checked={profileData.preferences.notifications.applicationUpdates}
                      onCheckedChange={(checked) => setProfileData({
                        ...profileData,
                        preferences: {
                          ...profileData.preferences,
                          notifications: {
                            ...profileData.preferences.notifications,
                            applicationUpdates: checked
                          }
                        }
                      })}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Privacy Settings
                  </CardTitle>
                  <CardDescription>
                    Control your data and privacy preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Profile Visibility</Label>
                    <Select
                      value={profileData.preferences.privacy.profileVisibility}
                      onValueChange={(value) => setProfileData({
                        ...profileData,
                        preferences: {
                          ...profileData.preferences,
                          privacy: {
                            ...profileData.preferences.privacy,
                            profileVisibility: value
                          }
                        }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private">Private</SelectItem>
                        <SelectItem value="universities">Universities Only</SelectItem>
                        <SelectItem value="public">Public</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Share Data with Partners</Label>
                      <p className="text-sm text-muted-foreground">Allow sharing anonymous data with partner institutions</p>
                    </div>
                    <Switch
                      checked={profileData.preferences.privacy.shareDataWithPartners}
                      onCheckedChange={(checked) => setProfileData({
                        ...profileData,
                        preferences: {
                          ...profileData.preferences,
                          privacy: {
                            ...profileData.preferences.privacy,
                            shareDataWithPartners: checked
                          }
                        }
                      })}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}