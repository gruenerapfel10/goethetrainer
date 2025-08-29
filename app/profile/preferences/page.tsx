'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from 'sonner';
import { useAuth } from '@/context/firebase-auth-context';
import { profileService } from '@/lib/firebase/profile-service';
import { Settings, Bell, Shield, Globe, Save } from 'lucide-react';

interface PreferencesData {
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

const countries = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 
  'France', 'Netherlands', 'Switzerland', 'Sweden', 'Other'
];

export default function PreferencesPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  
  const [profileData, setProfileData] = useState<PreferencesData>({
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

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.uid) {
        setIsLoadingProfile(false);
        return;
      }
      
      try {
        setIsLoadingProfile(true);
        const savedProfile = await profileService.getProfile(user.uid);
        
        if (savedProfile && savedProfile.preferences) {
          setProfileData({
            preferences: {
              notifications: savedProfile.preferences.notifications || {
                email: false,
                sms: false,
                deadlineReminders: false,
                applicationUpdates: false,
              },
              privacy: savedProfile.preferences.privacy || {
                profileVisibility: '',
                shareDataWithPartners: false,
              },
              application: savedProfile.preferences.application || {
                preferredApplicationSeason: '',
                targetCountries: [],
                budgetRange: '',
              },
            },
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
      
      // Merge preferences with existing data
      const updatedProfile = {
        ...existingProfile,
        preferences: profileData.preferences,
      };
      
      await profileService.saveProfile(user.uid, updatedProfile);
      toast.success('Preferences updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to update preferences. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateNotificationSetting = (key: keyof typeof profileData.preferences.notifications, value: boolean) => {
    setProfileData({
      ...profileData,
      preferences: {
        ...profileData.preferences,
        notifications: {
          ...profileData.preferences.notifications,
          [key]: value
        }
      }
    });
  };

  const updatePrivacySetting = (key: keyof typeof profileData.preferences.privacy, value: boolean | string) => {
    setProfileData({
      ...profileData,
      preferences: {
        ...profileData.preferences,
        privacy: {
          ...profileData.preferences.privacy,
          [key]: value
        }
      }
    });
  };

  const updateApplicationSetting = (key: keyof typeof profileData.preferences.application, value: string | string[]) => {
    setProfileData({
      ...profileData,
      preferences: {
        ...profileData.preferences,
        application: {
          ...profileData.preferences.application,
          [key]: value
        }
      }
    });
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
              <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
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
              <Settings className="w-8 h-8" />
              Preferences
            </h1>
            <p className="text-muted-foreground">Manage your notification, privacy, and application preferences</p>
          </div>
          <Button onClick={handleSave} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Notification Preferences */}
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Bell className="w-6 h-6" />
              Notification Preferences
            </h2>
            <p className="text-muted-foreground mt-1">
              Choose how you'd like to receive updates and reminders
            </p>
          </div>
          
          <div className="space-y-6 bg-white p-6 border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive notifications via email</p>
              </div>
              <Switch
                checked={profileData.preferences.notifications.email}
                onCheckedChange={(checked) => updateNotificationSetting('email', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">SMS Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive important updates via text message</p>
              </div>
              <Switch
                checked={profileData.preferences.notifications.sms}
                onCheckedChange={(checked) => updateNotificationSetting('sms', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Deadline Reminders</Label>
                <p className="text-sm text-muted-foreground">Get reminded about application deadlines</p>
              </div>
              <Switch
                checked={profileData.preferences.notifications.deadlineReminders}
                onCheckedChange={(checked) => updateNotificationSetting('deadlineReminders', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Application Updates</Label>
                <p className="text-sm text-muted-foreground">Receive updates on your application status</p>
              </div>
              <Switch
                checked={profileData.preferences.notifications.applicationUpdates}
                onCheckedChange={(checked) => updateNotificationSetting('applicationUpdates', checked)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Privacy Settings */}
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Shield className="w-6 h-6" />
              Privacy Settings
            </h2>
            <p className="text-muted-foreground mt-1">
              Control your data and privacy preferences
            </p>
          </div>
          
          <div className="space-y-6 bg-white p-6 border rounded-lg">
            <div className="space-y-2">
              <Label className="text-base font-medium">Profile Visibility</Label>
              <p className="text-sm text-muted-foreground mb-3">Choose who can see your profile information</p>
              <Select
                value={profileData.preferences.privacy.profileVisibility}
                onValueChange={(value) => updatePrivacySetting('profileVisibility', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private - Only you can see your profile</SelectItem>
                  <SelectItem value="universities">Universities Only - Only partner universities can see your profile</SelectItem>
                  <SelectItem value="public">Public - Your profile is publicly visible</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Share Data with Partners</Label>
                <p className="text-sm text-muted-foreground">Allow sharing anonymous data with partner institutions for research</p>
              </div>
              <Switch
                checked={profileData.preferences.privacy.shareDataWithPartners}
                onCheckedChange={(checked) => updatePrivacySetting('shareDataWithPartners', checked)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Application Preferences */}
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Globe className="w-6 h-6" />
              Application Preferences
            </h2>
            <p className="text-muted-foreground mt-1">
              Set your application preferences and target criteria
            </p>
          </div>
          
          <div className="space-y-6 bg-white p-6 border rounded-lg">
            <div className="space-y-2">
              <Label className="text-base font-medium">Preferred Application Season</Label>
              <p className="text-sm text-muted-foreground mb-3">When do you plan to apply?</p>
              <Select
                value={profileData.preferences.application.preferredApplicationSeason}
                onValueChange={(value) => updateApplicationSetting('preferredApplicationSeason', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select application season" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fall-2024">Fall 2024</SelectItem>
                  <SelectItem value="spring-2025">Spring 2025</SelectItem>
                  <SelectItem value="fall-2025">Fall 2025</SelectItem>
                  <SelectItem value="spring-2026">Spring 2026</SelectItem>
                  <SelectItem value="fall-2026">Fall 2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-base font-medium">Budget Range</Label>
              <p className="text-sm text-muted-foreground mb-3">What's your annual budget for education?</p>
              <Select
                value={profileData.preferences.application.budgetRange}
                onValueChange={(value) => updateApplicationSetting('budgetRange', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select budget range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="under-25k">Under $25,000</SelectItem>
                  <SelectItem value="25k-50k">$25,000 - $50,000</SelectItem>
                  <SelectItem value="50k-75k">$50,000 - $75,000</SelectItem>
                  <SelectItem value="75k-100k">$75,000 - $100,000</SelectItem>
                  <SelectItem value="over-100k">Over $100,000</SelectItem>
                  <SelectItem value="no-limit">No budget limit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}