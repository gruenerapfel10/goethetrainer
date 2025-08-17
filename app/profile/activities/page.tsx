'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from 'sonner';
import { useAuth } from '@/context/firebase-auth-context';
import { profileService } from '@/lib/firebase/profile-service';
import { Target, Trophy, Save, Plus, X } from 'lucide-react';

interface Activity {
  name: string;
  category: string;
  description: string;
  yearsParticipated: string;
  hoursPerWeek: string;
  position: string;
}

interface Achievement {
  title: string;
  description: string;
  date: string;
  type: string;
}

interface ActivitiesData {
  activities: Activity[];
  achievements: Achievement[];
}

const activityCategories = [
  'Sports', 'Music', 'Volunteer Work', 'Academic Clubs', 'Arts', 
  'Leadership', 'Work Experience', 'Research', 'Other'
];

const achievementTypes = [
  'Academic Award', 'Competition Win', 'Scholarship', 'Publication', 
  'Leadership Position', 'Community Service', 'Athletic Achievement', 'Other'
];

export default function ActivitiesPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  
  const [profileData, setProfileData] = useState<ActivitiesData>({
    activities: [],
    achievements: [],
  });

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.uid) {
        setIsLoadingProfile(false);
        return;
      }
      
      try {
        setIsLoadingProfile(true);
        const savedProfile = await profileService.getProfile(user.uid);
        
        if (savedProfile) {
          setProfileData({
            activities: savedProfile.activities || [],
            achievements: savedProfile.achievements || [],
          });
        }
      } catch (error: any) {
        console.error('Error loading profile:', error);
        toast.error('Failed to load profile data');
      } finally {
        setIsLoadingProfile(false);
      }
    };
    
    loadProfile();
  }, [user?.uid]);

  const handleSave = async () => {
    if (!user?.uid) {
      toast.error('You must be logged in to save your profile');
      return;
    }
    
    setIsLoading(true);
    try {
      // Get existing profile data to preserve other sections
      const existingProfile = await profileService.getProfile(user.uid);
      
      // Merge activities data with existing data
      const updatedProfile = {
        ...existingProfile,
        activities: profileData.activities,
        achievements: profileData.achievements,
      };
      
      await profileService.saveProfile(user.uid, updatedProfile);
      toast.success('Activities and achievements updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
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

  const updateActivity = (index: number, field: keyof Activity, value: string) => {
    const newActivities = [...profileData.activities];
    newActivities[index][field] = value;
    setProfileData({...profileData, activities: newActivities});
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

  const updateAchievement = (index: number, field: keyof Achievement, value: string) => {
    const newAchievements = [...profileData.achievements];
    newAchievements[index][field] = value;
    setProfileData({...profileData, achievements: newAchievements});
  };

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

  if (!user) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="max-w-md w-full p-6 border rounded-lg">
            <div className="text-center">
              <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Sign in Required</h2>
              <p className="text-muted-foreground">Please sign in to view and edit your profile</p>
            </div>
          </div>
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
            <h1 className="text-3xl font-semibold text-foreground mb-2 flex items-center gap-2">
              <Target className="w-8 h-8" />
              Activities & Achievements
            </h1>
            <p className="text-muted-foreground">Showcase your extracurricular activities and achievements</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={addActivity} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Activity
            </Button>
            <Button onClick={addAchievement} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Achievement
            </Button>
            <Button onClick={handleSave} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Activities Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <Target className="w-6 h-6" />
                Activities
              </h2>
              <p className="text-muted-foreground mt-1">Your extracurricular activities and involvement</p>
            </div>
            <Button onClick={addActivity} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Activity
            </Button>
          </div>
          
          {profileData.activities.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No activities added yet</h3>
              <p className="text-gray-600 mb-4">Start by adding your first extracurricular activity</p>
              <Button onClick={addActivity} variant="outline">
                Add Your First Activity
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {profileData.activities.map((activity, index) => (
                <div key={index} className="p-6 border rounded-lg bg-white shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-medium">Activity #{index + 1}</h3>
                    <Button 
                      onClick={() => removeActivity(index)} 
                      variant="ghost" 
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label>Activity Name</Label>
                      <Input
                        placeholder="National Honor Society"
                        value={activity.name}
                        onChange={(e) => updateActivity(index, 'name', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select
                        value={activity.category}
                        onValueChange={(value) => updateActivity(index, 'category', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {activityCategories.map(category => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Position/Role</Label>
                      <Input
                        placeholder="President, Member, Captain..."
                        value={activity.position}
                        onChange={(e) => updateActivity(index, 'position', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Years Participated</Label>
                      <Input
                        placeholder="2 years"
                        value={activity.yearsParticipated}
                        onChange={(e) => updateActivity(index, 'yearsParticipated', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Hours per Week</Label>
                      <Input
                        placeholder="5 hours"
                        value={activity.hoursPerWeek}
                        onChange={(e) => updateActivity(index, 'hoursPerWeek', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Describe your role, responsibilities, and accomplishments..."
                      value={activity.description}
                      onChange={(e) => updateActivity(index, 'description', e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Achievements Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <Trophy className="w-6 h-6" />
                Achievements
              </h2>
              <p className="text-muted-foreground mt-1">Your awards, recognitions, and notable accomplishments</p>
            </div>
            <Button onClick={addAchievement} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Achievement
            </Button>
          </div>
          
          {profileData.achievements.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
              <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No achievements added yet</h3>
              <p className="text-gray-600 mb-4">Start by adding your first achievement or award</p>
              <Button onClick={addAchievement} variant="outline">
                Add Your First Achievement
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {profileData.achievements.map((achievement, index) => (
                <div key={index} className="p-6 border rounded-lg bg-white shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-medium">Achievement #{index + 1}</h3>
                    <Button 
                      onClick={() => removeAchievement(index)} 
                      variant="ghost" 
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label>Achievement Title</Label>
                      <Input
                        placeholder="National Merit Scholar"
                        value={achievement.title}
                        onChange={(e) => updateAchievement(index, 'title', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={achievement.type}
                        onValueChange={(value) => updateAchievement(index, 'type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {achievementTypes.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Date Received</Label>
                      <Input
                        type="date"
                        value={achievement.date}
                        onChange={(e) => updateAchievement(index, 'date', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Describe your achievement and its significance..."
                      value={achievement.description}
                      onChange={(e) => updateAchievement(index, 'description', e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}