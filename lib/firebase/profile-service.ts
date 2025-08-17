import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  serverTimestamp,
  DocumentData
} from 'firebase/firestore';
import { db } from './config';
import { User } from 'firebase/auth';

export interface ProfileData {
  // Personal Information
  firstName?: string;
  lastName?: string;
  preferredName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  nationality?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  
  // Academic Information
  currentSchool?: string;
  graduationYear?: number;
  qualifications?: Array<{
    id: string;
    system: string;
    year: string;
    score: string;
    additionalInfo?: string;
  }>;
  
  // Test Scores
  testScores?: Array<{
    type: string;
    score: string;
    date: string;
    percentile?: string;
  }>;
  
  // Activities & Achievements
  activities?: Array<{
    name: string;
    category: string;
    description: string;
    yearsParticipated: string;
    hoursPerWeek: string;
    position: string;
  }>;
  
  achievements?: Array<{
    title: string;
    description: string;
    date: string;
    type: string;
  }>;
  
  // Preferences
  preferences?: {
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
  
  // Metadata
  updatedAt?: any;
  createdAt?: any;
}

class ProfileService {
  /**
   * Save or update user profile data
   */
  async saveProfile(userId: string, profileData: ProfileData): Promise<void> {
    if (!userId) {
      throw new Error('User ID is required to save profile');
    }

    try {
      const profileRef = doc(db, 'profiles', userId);
      
      // Check if profile exists
      const profileSnap = await getDoc(profileRef);
      
      if (profileSnap.exists()) {
        // Update existing profile
        await updateDoc(profileRef, {
          ...profileData,
          updatedAt: serverTimestamp()
        });
      } else {
        // Create new profile
        await setDoc(profileRef, {
          ...profileData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      throw new Error('Failed to save profile data');
    }
  }

  /**
   * Get user profile data
   */
  async getProfile(userId: string): Promise<ProfileData | null> {
    if (!userId) {
      throw new Error('User ID is required to get profile');
    }

    try {
      const profileRef = doc(db, 'profiles', userId);
      const profileSnap = await getDoc(profileRef);
      
      if (profileSnap.exists()) {
        return profileSnap.data() as ProfileData;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting profile:', error);
      throw new Error('Failed to get profile data');
    }
  }

  /**
   * Update specific fields in profile
   */
  async updateProfileFields(userId: string, fields: Partial<ProfileData>): Promise<void> {
    if (!userId) {
      throw new Error('User ID is required to update profile');
    }

    try {
      const profileRef = doc(db, 'profiles', userId);
      
      await updateDoc(profileRef, {
        ...fields,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating profile fields:', error);
      
      // If document doesn't exist, create it
      if ((error as any).code === 'not-found') {
        await this.saveProfile(userId, fields);
      } else {
        throw new Error('Failed to update profile fields');
      }
    }
  }

  /**
   * Save academic qualifications
   */
  async saveQualifications(userId: string, qualifications: any[]): Promise<void> {
    return this.updateProfileFields(userId, { qualifications });
  }

  /**
   * Save test scores
   */
  async saveTestScores(userId: string, testScores: any[]): Promise<void> {
    return this.updateProfileFields(userId, { testScores });
  }

  /**
   * Save activities
   */
  async saveActivities(userId: string, activities: any[]): Promise<void> {
    return this.updateProfileFields(userId, { activities });
  }

  /**
   * Save achievements
   */
  async saveAchievements(userId: string, achievements: any[]): Promise<void> {
    return this.updateProfileFields(userId, { achievements });
  }

  /**
   * Save preferences
   */
  async savePreferences(userId: string, preferences: any): Promise<void> {
    return this.updateProfileFields(userId, { preferences });
  }
}

export const profileService = new ProfileService();