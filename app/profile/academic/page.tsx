'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { useAuth } from '@/context/firebase-auth-context';
import { profileService } from '@/lib/firebase/profile-service';
import { GraduationCap, Save } from 'lucide-react';

interface AcademicData {
  currentSchool: string;
  graduationYear: number;
  gpa: string;
  gpaScale: string;
  classRank: string;
  classSize: string;
  intendedMajor: string;
  secondMajor: string;
}

export default function AcademicPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  
  const [profileData, setProfileData] = useState<AcademicData>({
    currentSchool: '',
    graduationYear: new Date().getFullYear() + 1,
    gpa: '',
    gpaScale: '',
    classRank: '',
    classSize: '',
    intendedMajor: '',
    secondMajor: '',
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
            currentSchool: savedProfile.currentSchool || '',
            graduationYear: savedProfile.graduationYear || new Date().getFullYear() + 1,
            gpa: savedProfile.gpa || '',
            gpaScale: savedProfile.gpaScale || '',
            classRank: savedProfile.classRank || '',
            classSize: savedProfile.classSize || '',
            intendedMajor: savedProfile.intendedMajor || '',
            secondMajor: savedProfile.secondMajor || '',
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
      
      // Merge academic data with existing data
      const updatedProfile = {
        ...existingProfile,
        ...profileData,
      };
      
      await profileService.saveProfile(user.uid, updatedProfile);
      toast.success('Academic information updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
              <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
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
              <GraduationCap className="w-8 h-8" />
              Academic Information
            </h1>
            <p className="text-muted-foreground">Your educational background and academic performance</p>
          </div>
          <Button onClick={handleSave} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Academic Information Form */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 space-y-2">
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
                {Array.from({length: 10}, (_, i) => {
                  const year = new Date().getFullYear() + i;
                  return (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="intendedMajor">Intended Major</Label>
            <Input
              id="intendedMajor"
              value={profileData.intendedMajor}
              onChange={(e) => setProfileData({...profileData, intendedMajor: e.target.value})}
              placeholder="Computer Science"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="secondMajor">Second Major (Optional)</Label>
            <Input
              id="secondMajor"
              value={profileData.secondMajor}
              onChange={(e) => setProfileData({...profileData, secondMajor: e.target.value})}
              placeholder="Mathematics"
            />
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-medium mb-4">Academic Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gpa">GPA</Label>
              <Input
                id="gpa"
                type="number"
                step="0.01"
                min="0"
                max="4"
                value={profileData.gpa}
                onChange={(e) => setProfileData({...profileData, gpa: e.target.value})}
                placeholder="3.85"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gpaScale">GPA Scale</Label>
              <Select
                value={profileData.gpaScale}
                onValueChange={(value) => setProfileData({...profileData, gpaScale: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select scale" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4.0">4.0 Scale</SelectItem>
                  <SelectItem value="5.0">5.0 Scale</SelectItem>
                  <SelectItem value="100">100 Point Scale</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="classRank">Class Rank (Optional)</Label>
              <Input
                id="classRank"
                type="number"
                min="1"
                value={profileData.classRank}
                onChange={(e) => setProfileData({...profileData, classRank: e.target.value})}
                placeholder="15"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="classSize">Class Size (Optional)</Label>
              <Input
                id="classSize"
                type="number"
                min="1"
                value={profileData.classSize}
                onChange={(e) => setProfileData({...profileData, classSize: e.target.value})}
                placeholder="250"
              />
            </div>
          </div>

          {profileData.classRank && profileData.classSize && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Class Rank:</strong> {profileData.classRank} of {profileData.classSize} 
                ({((parseInt(profileData.classRank) / parseInt(profileData.classSize)) * 100).toFixed(1)}th percentile)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}