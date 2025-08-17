'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { useAuth } from '@/context/firebase-auth-context';
import { profileService } from '@/lib/firebase/profile-service';
import { Award, Save, Plus, X } from 'lucide-react';

interface TestScore {
  type: string;
  score: string;
  date: string;
}

interface TestsData {
  testScores: TestScore[];
}

const testTypes = [
  { value: 'SAT', label: 'SAT', maxScore: 1600 },
  { value: 'ACT', label: 'ACT', maxScore: 36 },
  { value: 'TOEFL', label: 'TOEFL', maxScore: 120 },
  { value: 'IELTS', label: 'IELTS', maxScore: 9 },
  { value: 'AP', label: 'AP Exam', maxScore: 5 },
  { value: 'IB', label: 'IB Diploma', maxScore: 45 },
];

export default function TestsPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  
  const [profileData, setProfileData] = useState<TestsData>({
    testScores: [],
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
        
        if (savedProfile && savedProfile.testScores) {
          setProfileData({
            testScores: savedProfile.testScores,
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
      
      // Merge test scores with existing data
      const updatedProfile = {
        ...existingProfile,
        testScores: profileData.testScores,
      };
      
      await profileService.saveProfile(user.uid, updatedProfile);
      toast.success('Test scores updated successfully!');
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

  const updateTestScore = (index: number, field: keyof TestScore, value: string) => {
    const newScores = [...profileData.testScores];
    newScores[index][field] = value;
    setProfileData({...profileData, testScores: newScores});
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
              <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
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
              <Award className="w-8 h-8" />
              Test Scores
            </h1>
            <p className="text-muted-foreground">Add your standardized test scores</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={addTestScore} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Score
            </Button>
            <Button onClick={handleSave} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>

      {/* Test Scores Section */}
      <div className="space-y-6">
        {profileData.testScores.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No test scores added yet</h3>
            <p className="text-gray-600 mb-6">Start by adding your first standardized test score</p>
            <Button onClick={addTestScore} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Score
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {profileData.testScores.map((score, index) => (
              <div key={index} className="p-6 border rounded-lg bg-white shadow-sm">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-[140px]">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Test Type</label>
                    <Select
                      value={score.type}
                      onValueChange={(value) => updateTestScore(index, 'type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select test" />
                      </SelectTrigger>
                      <SelectContent>
                        {testTypes.map(test => (
                          <SelectItem key={test.value} value={test.value}>
                            {test.label} (Max: {test.maxScore})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex-1 min-w-[100px]">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Score</label>
                    <Input
                      type="number"
                      placeholder="Score"
                      value={score.score}
                      onChange={(e) => updateTestScore(index, 'score', e.target.value)}
                    />
                  </div>
                  
                  <div className="flex-1 min-w-[140px]">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Test Date</label>
                    <Input
                      type="date"
                      value={score.date}
                      onChange={(e) => updateTestScore(index, 'date', e.target.value)}
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <Button 
                      onClick={() => removeTestScore(index)} 
                      variant="ghost" 
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 mt-6"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Show test info if type is selected */}
                {score.type && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                      {testTypes.find(t => t.value === score.type)?.label} - Maximum Score: {testTypes.find(t => t.value === score.type)?.maxScore}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}