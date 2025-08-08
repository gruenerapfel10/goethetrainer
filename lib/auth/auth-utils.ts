import { auth } from '@/app/(auth)/auth';
import { db } from '@/lib/db/client';
import { user } from '@/lib/db/schema';
import { userProfiles, userRelationships } from '@/lib/db/schema-applications';
import { eq, and } from 'drizzle-orm';

export type UserRole = 'student' | 'parent' | 'counselor' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  profile?: any;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await auth();
  if (!session?.user?.email) return null;

  const dbUser = await db
    .select()
    .from(user)
    .where(eq(user.email, session.user.email))
    .limit(1);

  if (!dbUser.length) return null;

  const profile = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, dbUser[0].id))
    .limit(1);

  // Determine role - check if admin first
  let role: UserRole = 'student';
  if (dbUser[0].isAdmin) {
    role = 'admin';
  } else {
    // Check if user has any parent/counselor relationships
    const relationships = await db
      .select()
      .from(userRelationships)
      .where(eq(userRelationships.relatedUserId, dbUser[0].id))
      .limit(1);
    
    if (relationships.length > 0) {
      role = relationships[0].relationshipType as UserRole;
    }
  }

  return {
    id: dbUser[0].id,
    email: dbUser[0].email,
    role,
    profile: profile[0] || null
  };
}

export async function hasPermission(
  userId: string,
  targetUserId: string,
  permission: string
): Promise<boolean> {
  if (userId === targetUserId) return true;

  const relationship = await db
    .select()
    .from(userRelationships)
    .where(
      and(
        eq(userRelationships.studentId, targetUserId),
        eq(userRelationships.relatedUserId, userId),
        eq(userRelationships.isActive, true)
      )
    )
    .limit(1);

  if (!relationship.length) return false;

  const permissions = relationship[0].permissions as string[];
  return permissions?.includes(permission) || false;
}

export async function createUserProfile(userId: string, data: any) {
  return await db.insert(userProfiles).values({
    userId,
    ...data
  }).returning();
}

export async function updateUserProfile(userId: string, data: any) {
  return await db
    .update(userProfiles)
    .set({
      ...data,
      updatedAt: new Date()
    })
    .where(eq(userProfiles.userId, userId))
    .returning();
}

export async function inviteRelatedUser(
  studentId: string,
  email: string,
  relationshipType: 'parent' | 'counselor'
) {
  // First check if user exists
  let relatedUser = await db
    .select()
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  // If user doesn't exist, create them
  if (!relatedUser.length) {
    relatedUser = await db.insert(user).values({
      email,
      isAdmin: false
    }).returning();
  }

  // Create relationship
  return await db.insert(userRelationships).values({
    studentId,
    relatedUserId: relatedUser[0].id,
    relationshipType: relationshipType as any,
    permissions: relationshipType === 'parent' 
      ? ['view_applications', 'view_profile', 'view_documents']
      : ['view_applications', 'view_profile', 'edit_applications', 'add_recommendations'],
    isActive: false // Will be activated when invited user accepts
  }).returning();
}