import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { db } from '@/lib/db/client';
import { user } from '@/lib/db/schema';
import { 
  userProfiles, 
  testScores, 
  extracurriculars,
  educationHistory 
} from '@/lib/db/schema-applications';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database
    const dbUser = await db
      .select()
      .from(user)
      .where(eq(user.email, session.user.email))
      .limit(1);

    if (!dbUser.length) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = dbUser[0].id;

    // Fetch all profile data
    const [profile, scores, activities, education] = await Promise.all([
      db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1),
      db.select().from(testScores).where(eq(testScores.userId, userId)),
      db.select().from(extracurriculars).where(eq(extracurriculars.userId, userId)),
      db.select().from(educationHistory).where(eq(educationHistory.userId, userId))
    ]);

    return NextResponse.json({
      profile: profile[0] || null,
      testScores: scores,
      activities: activities,
      education: education
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database
    const dbUser = await db
      .select()
      .from(user)
      .where(eq(user.email, session.user.email))
      .limit(1);

    if (!dbUser.length) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = dbUser[0].id;
    const data = await request.json();

    // Update or create profile
    if (data.profile) {
      const existingProfile = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1);

      if (existingProfile.length) {
        // Update existing profile
        await db
          .update(userProfiles)
          .set({
            ...data.profile,
            userId, // Ensure userId doesn't change
            updatedAt: new Date()
          })
          .where(eq(userProfiles.userId, userId));
      } else {
        // Create new profile
        await db.insert(userProfiles).values({
          ...data.profile,
          userId
        });
      }
    }

    // Handle test scores
    if (data.testScores) {
      // Delete existing scores
      await db.delete(testScores).where(eq(testScores.userId, userId));
      
      // Insert new scores
      if (data.testScores.length > 0) {
        const scoresToInsert = data.testScores.map((score: any) => ({
          ...score,
          userId,
          id: undefined // Let DB generate ID
        }));
        await db.insert(testScores).values(scoresToInsert);
      }
    }

    // Handle activities
    if (data.activities) {
      // Delete existing activities
      await db.delete(extracurriculars).where(eq(extracurriculars.userId, userId));
      
      // Insert new activities
      if (data.activities.length > 0) {
        const activitiesToInsert = data.activities.map((activity: any) => ({
          ...activity,
          userId,
          id: undefined // Let DB generate ID
        }));
        await db.insert(extracurriculars).values(activitiesToInsert);
      }
    }

    // Calculate profile completion percentage
    let completed = 0;
    let total = 20; // Total number of important fields

    if (data.profile) {
      const checkFields = [
        'firstName', 'lastName', 'dateOfBirth', 'phone', 'citizenship',
        'gender', 'streetAddress', 'city', 'state', 'country',
        'currentSchool', 'graduationYear', 'gpa'
      ];
      
      checkFields.forEach(field => {
        if (data.profile[field]) completed++;
      });
    }

    if (data.testScores?.length > 0) completed += 3;
    if (data.activities?.length > 0) completed += 4;

    const profileCompletePercent = Math.round((completed / total) * 100);

    // Update profile completion percentage
    await db
      .update(userProfiles)
      .set({ profileCompletePercent })
      .where(eq(userProfiles.userId, userId));

    return NextResponse.json({ 
      success: true,
      profileCompletePercent 
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}