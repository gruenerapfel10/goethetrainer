import {type InferInsertModel, type InferSelectModel} from 'drizzle-orm';
import {
  pgTable,
  varchar,
  timestamp,
  text,
  uuid,
  boolean,
  integer,
  decimal,
  primaryKey,
  foreignKey,
  json,
  index,
  pgEnum,
  serial,
  date,
  unique,
} from 'drizzle-orm/pg-core';
import { user } from './schema';

// ==================== ENUMS ====================

export const userRoleEnum = pgEnum('user_role_enum', [
  'student',
  'parent',
  'counselor',
  'admin'
]);

export const applicationStatusEnum = pgEnum('application_status_enum', [
  'not_started',
  'in_progress',
  'ready_to_submit',
  'submitted',
  'under_review',
  'accepted',
  'rejected',
  'waitlisted',
  'deferred',
  'withdrawn'
]);

export const applicationTypeEnum = pgEnum('application_type_enum', [
  'early_decision',
  'early_action',
  'regular_decision',
  'rolling_admission',
  'transfer'
]);

export const documentTypeEnum = pgEnum('document_type_enum', [
  'transcript',
  'test_score',
  'essay',
  'recommendation_letter',
  'resume',
  'portfolio',
  'financial_aid',
  'other'
]);

export const testTypeEnum = pgEnum('test_type_enum', [
  'SAT',
  'ACT',
  'TOEFL',
  'IELTS',
  'GRE',
  'GMAT',
  'AP',
  'IB',
  'other'
]);

export const universityListCategoryEnum = pgEnum('university_list_category_enum', [
  'reach',
  'target',
  'safety',
  'considering',
  'applied'
]);

export const educationLevelEnum = pgEnum('education_level_enum', [
  'high_school',
  'associate',
  'bachelor',
  'master',
  'doctorate',
  'other'
]);

export const requirementStatusEnum = pgEnum('requirement_status_enum', [
  'not_started',
  'in_progress',
  'completed',
  'waived',
  'optional'
]);

// ==================== USER PROFILES ====================

export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  
  // Basic Info
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  middleName: varchar('middle_name', { length: 100 }),
  preferredName: varchar('preferred_name', { length: 100 }),
  dateOfBirth: date('date_of_birth'),
  phone: varchar('phone', { length: 20 }),
  
  // Demographics
  citizenship: varchar('citizenship', { length: 100 }),
  ethnicity: json('ethnicity'), // Array of ethnicities
  gender: varchar('gender', { length: 50 }),
  firstGenStudent: boolean('first_gen_student'),
  
  // Address
  streetAddress: text('street_address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  zipCode: varchar('zip_code', { length: 20 }),
  country: varchar('country', { length: 100 }),
  
  // Academic Profile
  currentSchool: text('current_school'),
  graduationYear: integer('graduation_year'),
  gpa: decimal('gpa', { precision: 4, scale: 2 }),
  gpaScale: decimal('gpa_scale', { precision: 3, scale: 1 }).default('4.0'),
  classRank: integer('class_rank'),
  classSize: integer('class_size'),
  
  // Common App IDs
  commonAppId: varchar('common_app_id', { length: 100 }),
  coalitionAppId: varchar('coalition_app_id', { length: 100 }),
  ucasId: varchar('ucas_id', { length: 100 }),
  
  // Meta
  profileCompletePercent: integer('profile_complete_percent').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (table) => ({
  userIdIdx: index('user_profiles_user_id_idx').on(table.userId),
}));

export type UserProfile = InferSelectModel<typeof userProfiles>;
export type NewUserProfile = InferInsertModel<typeof userProfiles>;

// ==================== EDUCATION HISTORY ====================

export const educationHistory = pgTable('education_history', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  
  schoolName: text('school_name').notNull(),
  level: educationLevelEnum('level').notNull(),
  startDate: date('start_date'),
  endDate: date('end_date'),
  graduationDate: date('graduation_date'),
  gpa: decimal('gpa', { precision: 4, scale: 2 }),
  gpaScale: decimal('gpa_scale', { precision: 3, scale: 1 }).default('4.0'),
  degree: text('degree'),
  major: text('major'),
  isCurrent: boolean('is_current').default(false),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (table) => ({
  userIdIdx: index('education_history_user_id_idx').on(table.userId),
}));

// ==================== TEST SCORES ====================

export const testScores = pgTable('test_scores', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  
  testType: testTypeEnum('test_type').notNull(),
  testDate: date('test_date'),
  
  // SAT Scores
  satTotal: integer('sat_total'),
  satMath: integer('sat_math'),
  satReading: integer('sat_reading'),
  
  // ACT Scores
  actComposite: integer('act_composite'),
  actMath: integer('act_math'),
  actEnglish: integer('act_english'),
  actReading: integer('act_reading'),
  actScience: integer('act_science'),
  actWriting: integer('act_writing'),
  
  // TOEFL Scores
  toeflTotal: integer('toefl_total'),
  toeflReading: integer('toefl_reading'),
  toeflListening: integer('toefl_listening'),
  toeflSpeaking: integer('toefl_speaking'),
  toeflWriting: integer('toefl_writing'),
  
  // IELTS Scores
  ieltsOverall: decimal('ielts_overall', { precision: 2, scale: 1 }),
  ieltsListening: decimal('ielts_listening', { precision: 2, scale: 1 }),
  ieltsReading: decimal('ielts_reading', { precision: 2, scale: 1 }),
  ieltsSpeaking: decimal('ielts_speaking', { precision: 2, scale: 1 }),
  ieltsWriting: decimal('ielts_writing', { precision: 2, scale: 1 }),
  
  // Other scores (GRE, GMAT, AP, IB)
  otherScore: json('other_score'),
  
  isOfficial: boolean('is_official').default(false),
  documentId: uuid('document_id'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (table) => ({
  userIdIdx: index('test_scores_user_id_idx').on(table.userId),
  testTypeIdx: index('test_scores_test_type_idx').on(table.testType),
}));

// ==================== EXTRACURRICULARS ====================

export const extracurriculars = pgTable('extracurriculars', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  
  activityName: text('activity_name').notNull(),
  category: varchar('category', { length: 100 }), // Sports, Music, Volunteer, etc.
  position: text('position'),
  organization: text('organization'),
  description: text('description'),
  
  startDate: date('start_date'),
  endDate: date('end_date'),
  hoursPerWeek: integer('hours_per_week'),
  weeksPerYear: integer('weeks_per_year'),
  
  grades: json('grades'), // [9, 10, 11, 12]
  isContinuing: boolean('is_continuing').default(false),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (table) => ({
  userIdIdx: index('extracurriculars_user_id_idx').on(table.userId),
}));

// ==================== UNIVERSITIES EXTENDED ====================

export const universitiesExtended = pgTable('universities_extended', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  
  // Basic Info (matches JSON data)
  name: text('name').notNull().unique(),
  country: varchar('country', { length: 100 }).notNull(),
  rank: integer('rank'),
  employerReputationRank: integer('employer_reputation_rank'),
  academicReputationRank: integer('academic_reputation_rank'),
  
  // Application Info
  commonAppEnabled: boolean('common_app_enabled').default(false),
  coalitionAppEnabled: boolean('coalition_app_enabled').default(false),
  ucasEnabled: boolean('ucas_enabled').default(false),
  directApplicationUrl: text('direct_application_url'),
  
  // Deadlines
  earlyDecisionDeadline: date('early_decision_deadline'),
  earlyActionDeadline: date('early_action_deadline'),
  regularDecisionDeadline: date('regular_decision_deadline'),
  
  // Requirements
  requiresSAT: boolean('requires_sat').default(false),
  requiresACT: boolean('requires_act').default(false),
  requiresTOEFL: boolean('requires_toefl').default(false),
  requiresIELTS: boolean('requires_ielts').default(false),
  essayPrompts: json('essay_prompts'), // Array of essay prompts
  supplementalEssays: integer('supplemental_essays').default(0),
  recommendationLetters: integer('recommendation_letters').default(2),
  
  // Stats
  acceptanceRate: decimal('acceptance_rate', { precision: 5, scale: 2 }),
  applicationFee: integer('application_fee'),
  tuitionInState: integer('tuition_in_state'),
  tuitionOutOfState: integer('tuition_out_of_state'),
  tuitionInternational: integer('tuition_international'),
  
  // Metadata
  logoUrl: text('logo_url'),
  websiteUrl: text('website_url'),
  admissionsUrl: text('admissions_url'),
  supportedDegrees: json('supported_degrees'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (table) => ({
  nameIdx: index('universities_extended_name_idx').on(table.name),
  rankIdx: index('universities_extended_rank_idx').on(table.rank),
}));

export type UniversityExtended = InferSelectModel<typeof universitiesExtended>;

// ==================== USER UNIVERSITY LISTS ====================

export const userUniversityLists = pgTable('user_university_lists', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  universityId: uuid('university_id')
    .notNull()
    .references(() => universitiesExtended.id, { onDelete: 'cascade' }),
  
  category: universityListCategoryEnum('category').notNull().default('considering'),
  notes: text('notes'),
  rank: integer('rank'), // User's personal ranking
  
  // Calculated scores
  fitScore: integer('fit_score'), // 0-100 based on profile match
  admissionProbability: decimal('admission_probability', { precision: 5, scale: 2 }), // 0-100%
  
  addedAt: timestamp('added_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (table) => ({
  userIdIdx: index('user_university_lists_user_id_idx').on(table.userId),
  uniqueUserUniversity: unique().on(table.userId, table.universityId),
}));

// ==================== APPLICATIONS ====================

export const applications = pgTable('applications', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  universityId: uuid('university_id')
    .notNull()
    .references(() => universitiesExtended.id),
  
  applicationYear: integer('application_year').notNull(),
  applicationType: applicationTypeEnum('application_type').notNull(),
  status: applicationStatusEnum('status').notNull().default('not_started'),
  
  // Progress
  progressPercent: integer('progress_percent').default(0),
  lastActivity: timestamp('last_activity'),
  
  // Submission Info
  submittedAt: timestamp('submitted_at'),
  applicationId: varchar('application_id', { length: 100 }), // External ID from Common App, etc.
  confirmationNumber: varchar('confirmation_number', { length: 100 }),
  
  // Decision Info
  decisionDate: date('decision_date'),
  decisionReceivedAt: timestamp('decision_received_at'),
  scholarshipOffered: decimal('scholarship_offered', { precision: 10, scale: 2 }),
  financialAidOffered: decimal('financial_aid_offered', { precision: 10, scale: 2 }),
  
  // Notes
  notes: text('notes'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (table) => ({
  userIdIdx: index('applications_user_id_idx').on(table.userId),
  universityIdIdx: index('applications_university_id_idx').on(table.universityId),
  statusIdx: index('applications_status_idx').on(table.status),
  uniqueUserUniversityYear: unique().on(table.userId, table.universityId, table.applicationYear),
}));

export type Application = InferSelectModel<typeof applications>;
export type NewApplication = InferInsertModel<typeof applications>;

// ==================== APPLICATION REQUIREMENTS ====================

export const applicationRequirements = pgTable('application_requirements', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  applicationId: uuid('application_id')
    .notNull()
    .references(() => applications.id, { onDelete: 'cascade' }),
  
  requirementType: varchar('requirement_type', { length: 100 }).notNull(),
  description: text('description'),
  isRequired: boolean('is_required').default(true),
  status: requirementStatusEnum('status').notNull().default('not_started'),
  
  deadline: date('deadline'),
  completedAt: timestamp('completed_at'),
  
  // Link to documents or other resources
  documentId: uuid('document_id'),
  notes: text('notes'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (table) => ({
  applicationIdIdx: index('application_requirements_application_id_idx').on(table.applicationId),
  statusIdx: index('application_requirements_status_idx').on(table.status),
}));

// ==================== DOCUMENTS ====================

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  
  documentType: documentTypeEnum('document_type').notNull(),
  fileName: text('file_name').notNull(),
  fileUrl: text('file_url').notNull(),
  fileSize: integer('file_size'), // in bytes
  mimeType: varchar('mime_type', { length: 100 }),
  
  // Version control
  version: integer('version').default(1),
  parentDocumentId: uuid('parent_document_id'),
  
  // Metadata
  title: text('title'),
  description: text('description'),
  tags: json('tags'), // Array of tags
  
  // For essays
  wordCount: integer('word_count'),
  essayPrompt: text('essay_prompt'),
  
  // For recommendations
  recommenderName: varchar('recommender_name', { length: 200 }),
  recommenderEmail: varchar('recommender_email', { length: 200 }),
  recommenderTitle: varchar('recommender_title', { length: 200 }),
  
  isVerified: boolean('is_verified').default(false),
  uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (table) => ({
  userIdIdx: index('documents_user_id_idx').on(table.userId),
  documentTypeIdx: index('documents_document_type_idx').on(table.documentType),
}));

export type Document = InferSelectModel<typeof documents>;
export type NewDocument = InferInsertModel<typeof documents>;

// ==================== APPLICATION DOCUMENTS ====================

export const applicationDocuments = pgTable('application_documents', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  applicationId: uuid('application_id')
    .notNull()
    .references(() => applications.id, { onDelete: 'cascade' }),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  requirementId: uuid('requirement_id')
    .references(() => applicationRequirements.id, { onDelete: 'set null' }),
  
  status: requirementStatusEnum('status').notNull().default('not_started'),
  submittedAt: timestamp('submitted_at'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  applicationIdIdx: index('application_documents_application_id_idx').on(table.applicationId),
  uniqueApplicationDocument: unique().on(table.applicationId, table.documentId),
}));

// ==================== DEADLINES ====================

export const deadlines = pgTable('deadlines', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  applicationId: uuid('application_id')
    .references(() => applications.id, { onDelete: 'cascade' }),
  
  title: text('title').notNull(),
  description: text('description'),
  deadlineDate: timestamp('deadline_date').notNull(),
  deadlineType: varchar('deadline_type', { length: 100 }), // application, document, test, etc.
  
  reminderDays: integer('reminder_days').default(7), // Days before deadline to remind
  reminderSent: boolean('reminder_sent').default(false),
  reminderSentAt: timestamp('reminder_sent_at'),
  
  isCompleted: boolean('is_completed').default(false),
  completedAt: timestamp('completed_at'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (table) => ({
  userIdIdx: index('deadlines_user_id_idx').on(table.userId),
  applicationIdIdx: index('deadlines_application_id_idx').on(table.applicationId),
  deadlineDateIdx: index('deadlines_deadline_date_idx').on(table.deadlineDate),
}));

// ==================== COMMON APP DATA ====================

export const commonAppData = pgTable('common_app_data', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  
  // All Common App fields stored as JSON for flexibility
  personalInfo: json('personal_info'),
  contactInfo: json('contact_info'),
  demographics: json('demographics'),
  geography: json('geography'),
  language: json('language'),
  citizenship: json('citizenship'),
  educationInfo: json('education_info'),
  grades: json('grades'),
  currentCourses: json('current_courses'),
  honors: json('honors'),
  futurePlans: json('future_plans'),
  activities: json('activities'),
  writing: json('writing'),
  disciplinaryHistory: json('disciplinary_history'),
  additionalInfo: json('additional_info'),
  
  lastSyncedAt: timestamp('last_synced_at'),
  isComplete: boolean('is_complete').default(false),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (table) => ({
  userIdIdx: index('common_app_data_user_id_idx').on(table.userId),
}));

// ==================== USER RELATIONSHIPS ====================

export const userRelationships = pgTable('user_relationships', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  studentId: uuid('student_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  relatedUserId: uuid('related_user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  
  relationshipType: userRoleEnum('relationship_type').notNull(), // parent or counselor
  permissions: json('permissions'), // Array of permissions like 'view_applications', 'edit_profile', etc.
  
  invitedAt: timestamp('invited_at').notNull().defaultNow(),
  acceptedAt: timestamp('accepted_at'),
  isActive: boolean('is_active').default(true),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  studentIdIdx: index('user_relationships_student_id_idx').on(table.studentId),
  relatedUserIdIdx: index('user_relationships_related_user_id_idx').on(table.relatedUserId),
  uniqueRelationship: unique().on(table.studentId, table.relatedUserId),
}));

// ==================== ANALYTICS ====================

export const applicationAnalytics = pgTable('application_analytics', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  
  totalApplications: integer('total_applications').default(0),
  applicationsSubmitted: integer('applications_submitted').default(0),
  acceptances: integer('acceptances').default(0),
  rejections: integer('rejections').default(0),
  waitlists: integer('waitlists').default(0),
  
  averageProgressPercent: integer('average_progress_percent').default(0),
  documentsUploaded: integer('documents_uploaded').default(0),
  essaysWritten: integer('essays_written').default(0),
  
  totalScholarshipsOffered: decimal('total_scholarships_offered', { precision: 10, scale: 2 }).default('0'),
  totalFinancialAidOffered: decimal('total_financial_aid_offered', { precision: 10, scale: 2 }).default('0'),
  
  timeSavedHours: integer('time_saved_hours').default(0),
  lastCalculatedAt: timestamp('last_calculated_at').notNull().defaultNow(),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (table) => ({
  userIdIdx: index('application_analytics_user_id_idx').on(table.userId),
}));