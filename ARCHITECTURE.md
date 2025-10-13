# Goethe Architecture

## Overview

Goethe is a comprehensive German language learning platform that provides structured, trackable sessions for mastering reading, writing, listening, and speaking skills. Built with Firebase as the complete backend infrastructure, it offers personalized learning experiences with detailed progress tracking and analytics.

## Core Purpose

- **Structured Language Learning**: Provide organized sessions for all four language skills
- **Session-Based Training**: Each practice session is tracked, scored, and stored for review
- **Progress Analytics**: Detailed metrics on improvement over time across all skills
- **Personalized Content**: Adaptive difficulty based on user performance
- **Comprehensive History**: Complete record of all learning sessions for review and analysis

## System Architecture

### Frontend Layer
- **Technology**: React/Next.js with TypeScript
- **UI Framework**: Tailwind CSS for responsive design
- **State Management**: Redux/Zustand for application state
- **Components**:
  - Dashboard for application overview
  - Job search and filtering interface
  - Application template builder
  - Document upload and management
  - Analytics visualization

### Backend Services
- **API Layer**: Node.js/Express or Python/FastAPI
- **Authentication**: Firebase Auth (see Authentication Architecture section below)
- **Queue System**: Redis/Bull for job queue management
- **Services**:
  - Job scraping service
  - Application submission service
  - AI content generation service
  - Email/notification service

### AI Integration
- **LLM Integration**: OpenAI/Anthropic API for content generation
- **Features**:
  - Resume parsing and optimization
  - Cover letter generation
  - Application form field mapping
  - Job description analysis
  - Skill matching algorithms

### Data Layer
- **Primary Database**: PostgreSQL for structured data
  - User profiles
  - Job listings
  - Application records
  - Templates and documents
- **Cache Layer**: Redis for session management and caching
- **Document Storage**: S3/Cloud Storage for resumes and documents

### External Integrations
- **Job Boards**: Indeed, LinkedIn, Glassdoor APIs
- **ATS Systems**: Common ATS platform integrations
- **Email Services**: SendGrid/SES for notifications
- **Calendar**: Google Calendar/Outlook for interview scheduling

## Key Workflows

### Application Flow
1. **Job Discovery**: Scrape or import job listings from multiple sources
2. **Matching**: AI analyzes job requirements against user profile
3. **Customization**: Generate tailored application materials
4. **Submission**: Automated form filling and submission
5. **Tracking**: Monitor application status and responses

### Data Pipeline
1. **Ingestion**: Collect job postings from various sources
2. **Processing**: Parse and standardize job data
3. **Enrichment**: Add company information and insights
4. **Storage**: Index for fast searching and filtering

## Authentication Architecture

### Overview
Goethe uses Firebase Authentication as its primary authentication service, providing secure user management with multiple authentication methods and seamless integration with the Next.js frontend.

### Firebase Configuration

#### Project Details
- **Firebase Project ID**: `goethetrainer`
- **Project Number**: `407470946856`
- **Auth Domain**: `goethetrainer.firebaseapp.com`
- **Web App ID**: `1:407470946856:web:4c74ffc3c4d694504c931d`

#### Configuration Files
1. **`.firebaserc`**: Links the codebase to the Firebase project
   - Located at: `/goethe/.firebaserc`
   - Contains default project mapping to `goethetrainer`

2. **`firebase.json`**: Firebase services configuration
   - Located at: `/goethe/firebase.json`
   - Configures Firestore rules and indexes

3. **Environment Variables** (`.env`):
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY - Public API key for client-side Firebase SDK
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN - Auth domain for Firebase Auth UI
   NEXT_PUBLIC_FIREBASE_PROJECT_ID - Firebase project identifier
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET - Cloud Storage bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID - FCM sender ID
   NEXT_PUBLIC_FIREBASE_APP_ID - Firebase app identifier
   ```

### Authentication Implementation

#### Client-Side Firebase SDK (`/lib/firebase/config.ts`)
- Initializes Firebase app with environment variables
- Exports initialized instances: `app`, `auth`, `db`
- Handles singleton pattern to prevent multiple initializations
- Includes debug logging for configuration validation

#### Authentication Context (`/context/firebase-auth-context.tsx`)
- **React Context Provider** wrapping the entire application
- **State Management**:
  - `user`: Current Firebase User object or null
  - `loading`: Authentication state loading indicator
  
- **Authentication Methods**:
  - `signIn(email, password)`: Email/password authentication
  - `signUp(email, password)`: New user registration
  - `signInWithGoogle()`: Google OAuth authentication
  - `logout()`: Sign out current user
  - `resetPassword(email)`: Password reset via email

- **Session Management**:
  - Uses `onAuthStateChanged` listener for real-time auth state
  - Sets HTTP-only cookie with ID token for server-side validation
  - Cookie expiry: 1 hour (max-age=3600)
  - Automatic navigation to `/jobs` on successful auth
  - Clears auth cookie on logout

#### Login/Signup UI (`/app/(auth)/login/page.tsx`)
- **Single Page Toggle Design**: Switch between login and signup views
- **Form Fields**:
  - Email input with validation
  - Password input (min 6 characters enforced by Firebase)
  - No additional fields for signup (profile created post-registration)

- **Authentication Methods**:
  1. Email/Password authentication
  2. Google OAuth via popup

- **Error Handling**:
  - `auth/user-not-found`: User doesn't exist
  - `auth/wrong-password`: Incorrect password
  - `auth/email-already-in-use`: Email taken during signup
  - `auth/weak-password`: Password too short
  - `auth/invalid-email`: Malformed email address
  - Generic error fallback with message display

- **UI States**:
  - Loading states during authentication
  - Disabled inputs during processing
  - Toast notifications for errors (using Sonner)

### Firebase Admin SDK (`/lib/firebase/admin.ts`)
- Server-side Firebase authentication
- Requires service account credentials:
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`  
  - `FIREBASE_PRIVATE_KEY`
- Used for:
  - Verifying ID tokens server-side
  - Managing users programmatically
  - Administrative Firestore operations

### Firestore Security Rules (`/firestore.rules`)
- **Profile Access**: Users can only read/write their own profile document
  - Path: `/profiles/{userId}`
  - Rule: `request.auth.uid == userId`
  
- **Public Collections** (temporarily open, should be secured in production):
  - `/chats/{chatId}`: Chat sessions
  - `/messages/{messageId}`: Chat messages
  - `/votes/{voteId}`: User feedback
  - `/suggested-messages/{messageId}`: AI suggestions
  - `/system-prompts/{promptId}`: System configurations

### Authentication Flow

1. **User Registration**:
   - User fills email/password on signup form
   - `createUserWithEmailAndPassword()` creates Firebase user
   - Auth context receives user via `onAuthStateChanged`
   - ID token generated and set as cookie
   - User redirected to `/jobs` dashboard

2. **User Login**:
   - User enters credentials on login form
   - `signInWithEmailAndPassword()` validates credentials
   - Auth context updates with user object
   - ID token cookie refreshed
   - Navigation to `/jobs` dashboard

3. **Google OAuth**:
   - User clicks "Continue with Google"
   - `signInWithPopup()` opens Google auth flow
   - On success, user created/retrieved
   - Same cookie and navigation flow as email auth

4. **Session Persistence**:
   - Firebase SDK handles token refresh automatically
   - Auth state persisted across page refreshes
   - Cookie updated on token refresh
   - Logout clears both Firebase session and cookie

5. **Protected Routes**:
   - Routes can check `useAuth()` hook for user presence
   - Server-side routes validate cookie token
   - Unauthorized users redirected to `/login`

### Authentication Helpers (`/lib/firebase/auth-helpers.ts`)
Additional utility functions for authentication operations:
- Token validation
- User profile management
- Permission checks
- Authentication middleware

### Profile Service (`/lib/firebase/profile-service.ts`)
Manages user profile data in Firestore:
- Creates initial profile on signup
- Updates profile information
- Retrieves user preferences
- Syncs with authentication state

### Chat Service Integration (`/lib/firebase/chat-service.ts`)
- Associates chats with authenticated users
- Manages message ownership
- Implements user-specific chat history

### Best Practices & Security Notes

1. **Environment Variables**:
   - All Firebase config stored in `.env`
   - `NEXT_PUBLIC_` prefix for client-side variables
   - Server-side credentials kept private

2. **Token Management**:
   - ID tokens expire after 1 hour
   - Automatic refresh handled by Firebase SDK
   - Server-side validation for API routes

3. **Error Handling**:
   - Specific error messages for common auth failures
   - Generic fallback for unexpected errors
   - No sensitive information in error messages

4. **Future Improvements**:
   - Implement proper Firestore rules for production
   - Add email verification requirement
   - Implement 2FA for sensitive operations
   - Add rate limiting for auth attempts
   - Implement proper service account key management
   - Add user roles and permissions system

## Security Considerations

- **Data Encryption**: End-to-end encryption for sensitive documents
- **API Rate Limiting**: Prevent abuse and manage third-party API limits
- **GDPR Compliance**: User data management and privacy controls
- **Credential Management**: Secure storage of user job board credentials
- **Authentication Security**: Firebase Auth with OAuth and secure session management

## Scalability Strategy

- **Horizontal Scaling**: Microservices architecture for independent scaling
- **Queue Management**: Distributed job queues for application processing
- **Caching Strategy**: Multi-level caching for performance
- **Database Sharding**: Partition data by user or region as needed

## Monitoring & Observability

- **Application Monitoring**: Error tracking and performance metrics
- **Success Metrics**: Application response rates, interview conversion
- **User Analytics**: Track user engagement and feature usage
- **System Health**: Infrastructure monitoring and alerting

## Development Considerations

- **Modular Design**: Loosely coupled components for flexibility
- **API-First**: RESTful/GraphQL APIs for all services
- **Testing Strategy**: Unit, integration, and E2E testing
- **CI/CD Pipeline**: Automated testing and deployment
- **Documentation**: OpenAPI specs and developer guides

## Session Architecture

### Overview
The session architecture provides a unified, scalable system for tracking all language learning activities across reading, writing, listening, and speaking modules. Every interaction is captured as a session with comprehensive metadata, progress tracking, and performance analytics.

### Firestore Data Model

#### Collections Structure

##### 1. Sessions Collection (`/sessions`)
Primary collection for all learning sessions across all skill types.

```javascript
/sessions/{sessionId}
{
  // Core Fields (Required)
  id: string,                    // Auto-generated session ID
  userId: string,                 // Firebase Auth UID
  skillType: 'reading' | 'writing' | 'listening' | 'speaking',
  status: 'active' | 'completed' | 'abandoned' | 'paused',
  
  // Timestamps
  startedAt: timestamp,           // Session start time
  completedAt: timestamp | null,  // Session completion time
  lastActivityAt: timestamp,      // Last user interaction
  duration: number,               // Total time in seconds
  activeDuration: number,         // Active time (excluding pauses)
  
  // Session Configuration
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2',  // CEFR level
  difficulty: 'easy' | 'medium' | 'hard',
  mode: string,                   // Specific to skill type
  topic: string,                  // Content topic/theme
  
  // Performance Metrics
  score: number,                  // Overall score (0-100)
  accuracy: number,               // Percentage accuracy
  completionRate: number,         // How much was completed
  
  // Detailed Metrics (skill-specific)
  metrics: {
    // Reading-specific
    wordsPerMinute?: number,
    comprehensionScore?: number,
    vocabularyScore?: number,
    
    // Writing-specific
    wordCount?: number,
    grammarScore?: number,
    coherenceScore?: number,
    vocabularyDiversity?: number,
    
    // Listening-specific
    firstAttemptAccuracy?: number,
    replayCount?: number,
    
    // Speaking-specific
    pronunciationScore?: number,
    fluencyScore?: number,
    intonationScore?: number,
    speechRate?: number
  },
  
  // Content Reference
  contentId: string,              // Reference to content item
  contentTitle: string,           // Display title
  contentSource: string,          // Source of content
  
  // User Progress
  checkpoints: [{
    timestamp: timestamp,
    progress: number,             // 0-100 percentage
    score: number,
    notes: string
  }],
  
  // Mistakes and Corrections
  mistakes: [{
    timestamp: timestamp,
    type: string,                 // Error category
    original: string,             // User's answer
    correct: string,              // Correct answer
    explanation: string
  }],
  
  // User Feedback
  userRating: number | null,      // 1-5 star rating
  userNotes: string,              // Personal notes
  bookmarked: boolean,
  
  // AI Analysis
  aiInsights: {
    strengths: string[],
    weaknesses: string[],
    recommendations: string[],
    nextLevel: string
  }
}
```

##### 2. Session Activities (`/sessions/{sessionId}/activities`)
Subcollection for granular activity tracking within a session.

```javascript
/sessions/{sessionId}/activities/{activityId}
{
  id: string,
  timestamp: timestamp,
  type: string,                   // 'answer', 'replay', 'hint', etc.
  data: object,                   // Activity-specific data
  correct: boolean | null,
  timeSpent: number,              // Seconds on this activity
  attempts: number
}
```

##### 3. User Progress (`/users/{userId}/progress`)
Aggregated progress data per user.

```javascript
/users/{userId}/progress/{skillType}
{
  skillType: 'reading' | 'writing' | 'listening' | 'speaking',
  currentLevel: string,           // Current CEFR level
  totalSessions: number,
  totalTime: number,              // Total time in seconds
  averageScore: number,
  bestScore: number,
  lastSessionDate: timestamp,
  
  // Weekly stats
  weeklyGoal: number,             // Sessions per week
  weeklyProgress: number,         // Current week's sessions
  streak: number,                 // Days in a row
  longestStreak: number,
  
  // Level progression
  levelProgress: {
    A1: { completed: boolean, score: number, sessions: number },
    A2: { completed: boolean, score: number, sessions: number },
    B1: { completed: boolean, score: number, sessions: number },
    B2: { completed: boolean, score: number, sessions: number },
    C1: { completed: boolean, score: number, sessions: number },
    C2: { completed: boolean, score: number, sessions: number }
  },
  
  // Detailed statistics
  statistics: {
    totalWords: number,           // For reading/writing
    totalMinutes: number,         // For listening/speaking
    vocabularyMastered: number,
    grammarPointsMastered: number,
    averageAccuracy: number,
    improvementRate: number       // Percentage improvement
  }
}
```

##### 4. Content Library (`/content/{skillType}`)
Content items for sessions.

```javascript
/content/{skillType}/{contentId}
{
  id: string,
  skillType: string,
  level: string,
  difficulty: string,
  title: string,
  description: string,
  duration: number,               // Estimated time
  topics: string[],
  tags: string[],
  
  // Content data (varies by type)
  content: {
    // Reading
    text?: string,
    questions?: array,
    
    // Listening
    audioUrl?: string,
    transcript?: string,
    
    // Writing
    prompt?: string,
    requirements?: object,
    
    // Speaking
    scenario?: string,
    expectedResponses?: array
  },
  
  // Metadata
  createdAt: timestamp,
  updatedAt: timestamp,
  usageCount: number,
  averageScore: number,
  averageCompletion: number
}
```

### Session Service API

#### Core Methods

```typescript
interface SessionService {
  // Session Lifecycle
  createSession(userId: string, skillType: SkillType, config: SessionConfig): Promise<Session>
  startSession(sessionId: string): Promise<void>
  pauseSession(sessionId: string): Promise<void>
  resumeSession(sessionId: string): Promise<void>
  completeSession(sessionId: string, results: SessionResults): Promise<void>
  abandonSession(sessionId: string): Promise<void>
  
  // Session Data
  getSession(sessionId: string): Promise<Session>
  getUserSessions(userId: string, filters?: SessionFilters): Promise<Session[]>
  getSessionsBySkill(userId: string, skillType: SkillType): Promise<Session[]>
  
  // Activities
  recordActivity(sessionId: string, activity: Activity): Promise<void>
  getSessionActivities(sessionId: string): Promise<Activity[]>
  
  // Progress
  updateProgress(userId: string, skillType: SkillType): Promise<void>
  getUserProgress(userId: string): Promise<Progress>
  getSkillProgress(userId: string, skillType: SkillType): Promise<SkillProgress>
  
  // Analytics
  getSessionAnalytics(sessionId: string): Promise<Analytics>
  getUserAnalytics(userId: string, dateRange?: DateRange): Promise<UserAnalytics>
  getPerformanceTrends(userId: string, skillType: SkillType): Promise<Trends>
  
  // Content
  getContent(skillType: SkillType, level: string): Promise<Content[]>
  getNextContent(userId: string, skillType: SkillType): Promise<Content>
  rateContent(contentId: string, rating: number): Promise<void>
}
```

### Firebase Security Rules

```javascript
// Firestore Rules for Sessions
service cloud.firestore {
  match /databases/{database}/documents {
    // Sessions - users can only access their own
    match /sessions/{sessionId} {
      allow read: if request.auth != null && 
        request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.userId;
      allow update: if request.auth != null && 
        request.auth.uid == resource.data.userId;
      
      // Session activities
      match /activities/{activityId} {
        allow read, write: if request.auth != null && 
          request.auth.uid == get(/databases/$(database)/documents/sessions/$(sessionId)).data.userId;
      }
    }
    
    // User progress
    match /users/{userId}/progress/{document=**} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Content library - read-only for authenticated users
    match /content/{skillType}/{contentId} {
      allow read: if request.auth != null;
      allow write: if false; // Admin only via Admin SDK
    }
  }
}
```

### Session Flow

#### 1. Session Creation
```
User clicks "Start Session" → 
Create session document → 
Initialize with configuration → 
Load appropriate content → 
Return session ID
```

#### 2. Active Session
```
Track all interactions → 
Record activities subcollection → 
Update checkpoints periodically → 
Calculate running metrics → 
Auto-save progress
```

#### 3. Session Completion
```
Calculate final scores → 
Generate AI insights → 
Update user progress → 
Award achievements → 
Recommend next content
```

### Real-time Features

- **Live Progress Updates**: Using Firestore listeners for real-time progress
- **Session Recovery**: Auto-save and recovery for interrupted sessions
- **Collaborative Sessions**: Future support for peer learning
- **Live Feedback**: Immediate scoring and corrections

### Performance Optimizations

1. **Composite Indexes**:
   - `userId + skillType + startedAt` for quick session queries
   - `userId + status + lastActivityAt` for active session detection
   - `skillType + level + difficulty` for content matching

2. **Data Aggregation**:
   - Pre-calculated statistics in user progress documents
   - Periodic batch updates for analytics
   - Cached content recommendations

3. **Pagination**:
   - Limit session history queries to 20 items
   - Implement infinite scroll with cursor pagination
   - Archive old sessions to cold storage

### UI Components Architecture

#### Shared Components

1. **SessionCard**: Displays session summary in history
2. **SessionTimer**: Active session timer with pause/resume
3. **ProgressBar**: Visual progress indicator
4. **ScoreDisplay**: Animated score presentation
5. **SessionHistory**: Paginated list of past sessions
6. **MetricsChart**: Performance visualization
7. **LevelBadge**: Current level indicator
8. **StreakCounter**: Motivation tracking

#### Page Structure

Each skill page (`/reading`, `/writing`, `/listening`, `/speaking`) follows:

```typescript
interface SkillPage {
  // Header Section
  header: {
    title: string
    currentLevel: string
    streak: number
    nextGoal: string
  }
  
  // Action Section
  startSessionButton: {
    onClick: () => void
    disabled: boolean
    text: string
  }
  
  // Active Session (if exists)
  activeSession?: {
    timer: Component
    progress: Component
    content: Component
    controls: Component
  }
  
  // History Section
  history: {
    sessions: Session[]
    onLoadMore: () => void
    onSessionClick: (id: string) => void
  }
  
  // Stats Section
  statistics: {
    totalTime: number
    averageScore: number
    improvement: number
    chart: Component
  }
}
```

### Error Handling & Recovery

1. **Session Recovery**:
   - Auto-save every 30 seconds
   - Restore incomplete sessions on app reload
   - Conflict resolution for multiple tabs

2. **Offline Support**:
   - Queue actions when offline
   - Sync when connection restored
   - Local storage for active session

3. **Data Validation**:
   - Client-side validation before Firestore writes
   - Server-side validation in security rules
   - Data sanitization for user inputs

## Future Enhancements

- **Mobile Applications**: Native iOS/Android apps with offline support
- **Voice Recognition**: Advanced speaking assessment with AI
- **Peer Learning**: Collaborative sessions and competitions
- **Adaptive AI**: Personalized content generation based on performance
- **Gamification**: Achievements, badges, and leaderboards
- **Teacher Dashboard**: For instructors to monitor student progress