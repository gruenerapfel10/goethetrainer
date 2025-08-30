# Firebase Architecture - Goethe Trainer

## Overview
This document outlines the Firebase architecture for the Goethe Trainer application, which provides German language practice exercises for B1 level certification preparation.

## Firebase Project
- **Project ID**: `goethetrainer`
- **Display Name**: Goethe Trainer
- **Console URL**: https://console.firebase.google.com/project/goethetrainer/overview

## Services Used

### 1. Firebase Authentication
**Purpose**: User registration, login, and session management

**Features**:
- Email/password authentication
- Google OAuth integration  
- Password reset functionality
- Token-based session management with HTTP cookies

**Implementation**: `/context/firebase-auth-context.tsx`
- Provides React context for auth state
- Handles automatic token refresh
- Manages routing post-authentication
- Cookie-based token storage for SSR compatibility

### 2. Cloud Firestore
**Purpose**: Primary database for user data and exercise sessions

**Collections Structure**:
```
profiles/
  {userId}/
    - Personal information (firstName, lastName, email, etc.)
    - Academic details (qualifications, testScores, activities)
    - Preferences (notifications, privacy settings)
    - Language learning metadata
    - timestamps (createdAt, updatedAt)

exercise-sessions/
  {sessionId}/
    userId: string                    // Foreign key to user
    exerciseType: ExerciseType        // 'reading' | 'writing' | 'listening' | 'speaking'
    exerciseTitle: string             // Human readable title (e.g., "Ein Tag in Berlin")
    startedAt: Timestamp              // When session was created
    completedAt?: Timestamp           // When session was completed (null if incomplete)
    answers: ExerciseAnswer[]         // Array of user responses
    score?: number                    // Final calculated score (0-totalQuestions)
    totalQuestions: number            // Total number of questions in exercise
    timeSpent: number                 // Total time in seconds
    status: SessionStatus             // 'in-progress' | 'completed' | 'abandoned'
    metadata?: {                      // Optional exercise metadata
      level?: string                  // 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'
      difficulty?: string             // 'beginner', 'intermediate', 'advanced'
      tags?: string[]                 // ['reading-comprehension', 'vocabulary', etc.]
    }

  ExerciseAnswer structure:
    questionId: string                // Unique identifier for question
    answer: string                    // User's selected answer ('a', 'b', 'c', 'd')
    timeTaken?: number                // Time in seconds to answer this question
    timestamp?: Timestamp             // When this answer was submitted

  SessionStatus enum: 'in-progress' | 'completed' | 'abandoned'
  ExerciseType enum: 'reading' | 'writing' | 'listening' | 'speaking'
```

**Session ID Format**:
- Format: `{userId}_{exerciseType}_{timestamp}`
- Example: `abc123_reading_1672531200000`
- Ensures uniqueness and easy identification

**Implementation**: 
- `/lib/firebase/profile-service.ts` - ProfileService class for user data operations
- `/lib/firebase/session-service.ts` - SessionService class for exercise session management

### 3. Firebase Storage
**Purpose**: File storage for exercise materials and user uploads

**Structure**:
```
exercise-materials/
  reading/
    - source texts
    - audio files (for listening components)
  writing/
    - prompt templates
  listening/
    - audio files
  speaking/
    - prompt audio files
    
user-uploads/
  {userId}/
    - writing submissions
    - speaking recordings
```

### 4. Security Rules

**Firestore Rules**:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own profile
    match /profiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can only access their own exercise sessions
    match /exercise-sessions/{sessionId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
  }
}
```

**Storage Rules**:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Exercise materials are publicly readable
    match /exercise-materials/{allPaths=**} {
      allow read: if true;
      allow write: if false; // Only admins can upload via console
    }
    
    // User uploads are private to the user
    match /user-uploads/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Configuration Files

### Environment Variables (`.env.local`)
```bash
# Firebase Client Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=placeholder_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=goethetrainer.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=goethetrainer
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=goethetrainer.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=placeholder_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=placeholder_app_id

# Firebase Admin Configuration (for server-side)
FIREBASE_PROJECT_ID=goethetrainer
FIREBASE_CLIENT_EMAIL=placeholder_client_email
FIREBASE_PRIVATE_KEY="placeholder_private_key"
```

### Firebase Configuration (`firebase.json`)
```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

## Data Flow

### Exercise Session Flow
1. **Session Creation**:
   - User clicks "Start Exercise" on `/reading` page
   - `sessionService.startSession()` creates new document in `exercise-sessions/`
   - Session ID generated in format: `{userId}_{exerciseType}_{timestamp}`
   - User redirected to `/reading?sessionId={sessionId}`

2. **Session Loading**:
   - URL contains sessionId parameter
   - `sessionService.getSession()` loads existing session data
   - Validates session belongs to current user
   - Restores previous answers if session is in-progress
   - Shows results if session is already completed

3. **Real-time Answer Tracking**:
   - Each answer triggers `sessionService.updateAnswer()`
   - Updates `answers` array in session document
   - Stores questionId, answer, and optional timing data

4. **Session Completion**:
   - User submits final answers
   - `sessionService.completeSession()` calculates final score
   - Updates session with `completedAt`, `score`, `timeSpent`, and status
   - Shows results screen with detailed breakdown

5. **Session Abandonment**:
   - User navigates away before completion
   - Cleanup effect calls `sessionService.abandonSession()`
   - Updates session status and records partial progress

6. **Session Recovery**:
   - Users can return to in-progress sessions via URL
   - All previous answers are restored
   - Timer continues from where left off

### Authentication Flow  
1. User signs in via email/password or Google OAuth
2. Firebase Auth generates JWT token
3. Token stored as HTTP cookie for SSR compatibility
4. Context provider manages auth state across components
5. Protected routes check auth status before rendering

### URL Routing & Session Management
**Reading Exercise Routes**:
- `/reading` - Landing page with exercise overview and "Start Exercise" button
- `/reading?sessionId={sessionId}` - Active exercise session with unique ID

**Session State Management**:
- URL-based session tracking enables bookmarking and sharing
- Session validation prevents unauthorized access
- Automatic session recovery for interrupted sessions
- Real-time state synchronization with Firestore

**Navigation Flow**:
```
Landing Page (/reading)
       ↓ [Start Exercise]
Session Creation (sessionService.startSession)
       ↓
Exercise Page (/reading?sessionId=xyz)
       ↓ [Complete/Abandon]
Results/Back to Landing
```

## Migration from MUA Project

### Completed Changes
- Updated project references from `muauni` to `goethetrainer`
- Created new Firebase project with appropriate services
- Updated environment configuration placeholders

### Pending Changes
- Replace MUA-specific functionality with Goethe training features
- Remove university-related data structures
- Update auth routing to use language skill pages instead of university pages
- Implement exercise session tracking service

## Security Considerations
- All sensitive operations require authentication
- User data is isolated by Firebase security rules
- No sensitive keys exposed in client-side code
- Exercise materials are read-only for users
- User uploads are private and scoped to individual users

## Performance Optimizations
- Offline support via Firestore local persistence
- Indexed queries for efficient session retrieval
- Lazy loading of exercise materials
- Client-side caching of user preferences

## Monitoring & Analytics
- Firebase Analytics for user engagement tracking
- Performance monitoring for exercise completion rates
- Error tracking for authentication and database issues