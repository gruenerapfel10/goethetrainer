import { SessionTypeEnum, type SessionConfig } from '../session-registry';
import { QuestionTypeName } from '../questions/question-registry';

export const readingSessionConfig: SessionConfig = {
  type: SessionTypeEnum.READING,
  
  metadata: {
    displayName: 'Reading Session',
    displayNameKey: 'sessions.reading.displayName',
    description: 'Practice and improve your reading comprehension skills',
    descriptionKey: 'sessions.reading.description',
    icon: 'book-open',
    color: 'blue',
  },
  
  schema: {
    fields: {
      // Content fields
      textId: {
        name: 'textId',
        type: 'string',
        required: false,
        description: 'ID of the text being read',
      },
      textTitle: {
        name: 'textTitle',
        type: 'string',
        required: false,
        description: 'Title of the text being read',
      },
      textLanguage: {
        name: 'textLanguage',
        type: 'string',
        required: false,
        defaultValue: 'de',
        description: 'Language of the text',
      },
      
      // Progress metrics
      wordsRead: {
        name: 'wordsRead',
        type: 'number',
        required: true,
        defaultValue: 0,
        description: 'Number of words read in this session',
      },
      pagesRead: {
        name: 'pagesRead',
        type: 'number',
        required: false,
        defaultValue: 0,
        description: 'Number of pages completed',
      },
      
      // Performance metrics
      comprehensionScore: {
        name: 'comprehensionScore',
        type: 'number',
        required: false,
        description: 'Comprehension test score (0-100)',
      },
      readingSpeed: {
        name: 'readingSpeed',
        type: 'number',
        required: false,
        defaultValue: 0,
        description: 'Words per minute',
      },
      
      // Interactive features
      highlights: {
        name: 'highlights',
        type: 'array',
        required: false,
        defaultValue: [],
        description: 'Text highlights with timestamps',
      },
      lookups: {
        name: 'lookups',
        type: 'array',
        required: false,
        defaultValue: [],
        description: 'Dictionary lookups for unknown words',
      },
      notes: {
        name: 'notes',
        type: 'array',
        required: false,
        defaultValue: [],
        description: 'User notes and annotations',
      },
      
      // Engagement metrics
      pauseCount: {
        name: 'pauseCount',
        type: 'number',
        required: false,
        defaultValue: 0,
        description: 'Number of times the session was paused',
      },
      focusTime: {
        name: 'focusTime',
        type: 'number',
        required: false,
        defaultValue: 0,
        description: 'Time spent actively reading (in seconds)',
      },
    },
    
    metrics: {
      primary: 'wordsRead',
      secondary: ['readingSpeed', 'comprehensionScore', 'pagesRead'],
      calculated: [
        {
          name: 'averageSpeed',
          formula: 'wordsRead / (duration / 60)',
        },
        {
          name: 'focusPercentage',
          formula: '(focusTime / duration) * 100',
        },
      ],
    },
  },
  
  // Supported question types for reading sessions (Goethe C1 compliant)
  supportedQuestions: [
    QuestionTypeName.GAP_TEXT_MULTIPLE_CHOICE
  ],
  
  features: {
    supportsTextInput: true,
    supportsFileUpload: true,
    supportsDictionary: true,
    supportsHighlighting: true,
    supportsNotes: true,
  },
  
  defaults: {
    targetDuration: 1800, // 30 minutes
    questionCount: 9, // Generate 9 questions by default (0-8 indexing)
    targetMetrics: {
      wordsRead: 500,
      readingSpeed: 200,
      comprehensionScore: 80,
    },
  },
  
  validation: {
    minDuration: 60, // Minimum 1 minute
    maxDuration: 14400, // Maximum 4 hours
    customRules: [
      {
        field: 'wordsRead',
        rule: 'value >= 0',
        message: 'Words read must be non-negative',
      },
      {
        field: 'comprehensionScore',
        rule: 'value >= 0 && value <= 100',
        message: 'Comprehension score must be between 0 and 100',
      },
      {
        field: 'readingSpeed',
        rule: 'value >= 0 && value <= 1000',
        message: 'Reading speed must be between 0 and 1000 WPM',
      },
    ],
  },
};