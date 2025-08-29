'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from 'sonner';
import { useAuth } from '@/context/firebase-auth-context';
import { profileService } from '@/lib/firebase/profile-service';
import { User, Save } from 'lucide-react';

interface PersonalData {
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
}

export default function PersonalPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  
  const [profileData, setProfileData] = useState<PersonalData>({
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
            firstName: savedProfile.firstName || '',
            lastName: savedProfile.lastName || '',
            preferredName: savedProfile.preferredName || '',
            email: savedProfile.email || user.email || '',
            phone: savedProfile.phone || '',
            dateOfBirth: savedProfile.dateOfBirth || '',
            nationality: savedProfile.nationality || '',
            address: savedProfile.address || {
              street: '',
              city: '',
              state: '',
              zipCode: '',
              country: '',
            },
          });
        } else {
          setProfileData(prev => ({
            ...prev,
            email: user.email || '',
          }));
        }
      } catch (error: any) {
        console.error('Error loading profile:', error);
        toast.error('Failed to load profile data');
      } finally {
        setIsLoadingProfile(false);
      }
    };
    
    loadProfile();
  }, [user?.uid, user?.email]);

  const handleSave = async () => {
    if (!user?.uid) {
      toast.error('You must be logged in to save your profile');
      return;
    }
    
    setIsLoading(true);
    try {
      // Get existing profile data to preserve other sections
      const existingProfile = await profileService.getProfile(user.uid);
      
      // Merge personal data with existing data
      const updatedProfile = {
        ...existingProfile,
        ...profileData,
      };
      
      await profileService.saveProfile(user.uid, updatedProfile);
      toast.success('Personal information updated successfully!');
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
              <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
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
              <User className="w-8 h-8" />
              Personal Information
            </h1>
            <p className="text-muted-foreground">Your basic personal details and contact information</p>
          </div>
          <Button onClick={handleSave} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Personal Information Form */}
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
          <div className="space-y-2">
            <Label htmlFor="nationality">Nationality</Label>
            <Input
              id="nationality"
              value={profileData.nationality}
              onChange={(e) => setProfileData({...profileData, nationality: e.target.value})}
              placeholder="United States"
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
            <div className="space-y-2">
              <Label htmlFor="zipCode">ZIP/Postal Code</Label>
              <Input
                id="zipCode"
                value={profileData.address.zipCode}
                onChange={(e) => setProfileData({
                  ...profileData, 
                  address: {...profileData.address, zipCode: e.target.value}
                })}
                placeholder="10001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={profileData.address.country}
                onChange={(e) => setProfileData({
                  ...profileData, 
                  address: {...profileData.address, country: e.target.value}
                })}
                placeholder="United States"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}