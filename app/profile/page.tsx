'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from 'sonner';
import { useAuth } from '@/context/firebase-auth-context';
import { useProfile } from '@/context/profile-context';
import { AcademicSection } from './academic-section';
import { profileService, ProfileData as FirebaseProfileData } from '@/lib/firebase/profile-service';
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
  const { activeSection } = useProfile();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  
  const [profileData, setProfileData] = useState<ProfileData>({
    // All fields start empty - will be populated from Firebase
    firstName: '',
    lastName: '',
    preferredName: '',
    email: '',
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
    graduationYear: new Date().getFullYear() + 1, // Current year + 1
    gpa: '',
    gpaScale: '',
    classRank: '',
    classSize: '',
    intendedMajor: '',
    secondMajor: '',
    
    // Test Scores
    testScores: [],
    
    // Activities & Achievements
    activities: [],
    achievements: [],
    
    // Preferences - all defaults removed
    preferences: {
      notifications: {
        email: false,
        sms: false,
        deadlineReminders: false,
        applicationUpdates: false,
      },
      privacy: {
        profileVisibility: '',
        shareDataWithPartners: false,
      },
      application: {
        preferredApplicationSeason: '',
        targetCountries: [],
        budgetRange: '',
      },
    },
  });

  // Load profile data when component mounts or user changes
  useEffect(() => {
    const loadProfile = async () => {
      console.log('[ProfilePage] useEffect triggered');
      console.log('[ProfilePage] User object:', user);
      console.log('[ProfilePage] User UID:', user?.uid);
      console.log('[ProfilePage] User email:', user?.email);
      
      if (!user?.uid) {
        console.log('[ProfilePage] No user ID, stopping profile load');
        setIsLoadingProfile(false);
        return;
      }
      
      try {
        console.log('[ProfilePage] Starting profile load for user:', user.uid);
        setIsLoadingProfile(true);
        
        const savedProfile = await profileService.getProfile(user.uid);
        console.log('[ProfilePage] Profile service response:', savedProfile);
        
        if (savedProfile) {
          console.log('[ProfilePage] Setting profile data from saved profile');
          // Use ONLY Firebase data - no merging with defaults
          setProfileData(savedProfile as ProfileData);
        } else {
          // If no profile exists, create completely empty profile with just email
          console.log('[ProfilePage] No saved profile found for user:', user.email);
          // Keep the form completely empty except for email from auth
          setProfileData({
            firstName: '',
            lastName: '',
            preferredName: '',
            email: user.email || '',
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
            currentSchool: '',
            graduationYear: new Date().getFullYear() + 1,
            gpa: '',
            gpaScale: '',
            classRank: '',
            classSize: '',
            intendedMajor: '',
            secondMajor: '',
            testScores: [],
            activities: [],
            achievements: [],
            preferences: {
              notifications: {
                email: false,
                sms: false,
                deadlineReminders: false,
                applicationUpdates: false,
              },
              privacy: {
                profileVisibility: '',
                shareDataWithPartners: false,
              },
              application: {
                preferredApplicationSeason: '',
                targetCountries: [],
                budgetRange: '',
              },
            },
          });
        }
      } catch (error: any) {
        console.error('[ProfilePage] Error loading profile:', {
          message: error.message,
          code: error.code,
          stack: error.stack,
          details: error
        });
        toast.error(error.message || 'Failed to load profile data');
      } finally {
        console.log('[ProfilePage] Setting loading to false');
        setIsLoadingProfile(false);
      }
    };
    
    loadProfile();
  }, [user?.uid]); // Only depend on user.uid, not entire user object

  const handleSave = async () => {
    if (!user?.uid) {
      toast.error('You must be logged in to save your profile');
      return;
    }
    
    setIsLoading(true);
    try {
      await profileService.saveProfile(user.uid, profileData);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const addTestScore = () => {
    setProfileData({
      ...profileData,
      testScores: [...profileData.testScores, { type: '', score: '', date: '' }]
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
        name: '', category: '', description: '', yearsParticipated: '', 
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
        title: '', description: '', date: '', type: '' 
      }]
    });
  };

  const removeAchievement = (index: number) => {
    setProfileData({
      ...profileData,
      achievements: profileData.achievements.filter((_, i) => i !== index)
    });
  };

  // Profile sections are now managed by the AppSidebar

  // Show loading state while fetching profile
  if (isLoadingProfile) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6">
              <div className="text-center">
                <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Sign in Required</h2>
                <p className="text-muted-foreground">Please sign in to view and edit your profile</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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

      {/* Main Content - Full Width */}
      <div>
          {/* Personal Information */}
          {activeSection === 'personal' && (
            <div className="space-y-6">
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Personal Information
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    Your basic personal details and contact information
                  </p>
                </div>
                <div className="space-y-6">
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
                </div>
              </div>
            </div>
          )}

          {/* Academic Information */}
          {activeSection === 'academic' && (
            <div className="space-y-6">
              <AcademicSection 
                profileData={profileData}
                setProfileData={setProfileData}
              />
            </div>
          )}

          {/* Test Scores */}
          {activeSection === 'tests' && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-semibold flex items-center gap-2">
                      <Award className="w-5 h-5" />
                      Test Scores
                    </h2>
                    <p className="text-muted-foreground mt-1">
                      Add your standardized test scores
                    </p>
                  </div>
                  <Button onClick={addTestScore} variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Score
                  </Button>
                </div>
                <div>
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
                </div>
              </div>
            </div>
          )}

          {/* Activities */}
          {activeSection === 'activities' && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-semibold flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Activities & Achievements
                    </h2>
                    <p className="text-muted-foreground mt-1">
                      Showcase your extracurricular activities and achievements
                    </p>
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
                <div className="space-y-6">
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
                </div>
              </div>
            </div>
          )}

          {/* Preferences */}
          {activeSection === 'preferences' && (
            <div className="space-y-6">
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Notification Preferences
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    Choose how you'd like to receive updates
                  </p>
                </div>
                <div className="space-y-4">
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
                </div>

                <div className="mt-8">
                  <div className="mb-6">
                    <h2 className="text-2xl font-semibold flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Privacy Settings
                    </h2>
                    <p className="text-muted-foreground mt-1">
                      Control your data and privacy preferences
                    </p>
                  </div>
                  <div className="space-y-4">
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
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}