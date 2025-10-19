import { SessionTypeEnum, type SessionConfig } from '../session-registry';
import { QuestionTypeName } from '../questions/question-registry';

export const writingSessionConfig: SessionConfig = {
  type: SessionTypeEnum.WRITING,
  
  metadata: {
    displayName: 'Writing Session',
    displayNameKey: 'sessions.writing.displayName',
    description: 'Practice writing skills and improve grammar',
    descriptionKey: 'sessions.writing.description',
    icon: 'pen-tool',
    color: 'green',
  },
  
  schema: {
    fields: {
      // Content fields
      prompt: {
        name: 'prompt',
        type: 'string',
        required: false,
        description: 'Writing prompt or topic',
      },
      writingType: {
        name: 'writingType',
        type: 'string',
        required: false,
        defaultValue: 'freeform',
        description: 'Type of writing (essay, letter, story, etc.)',
      },
      targetLanguage: {
        name: 'targetLanguage',
        type: 'string',
        required: false,
        defaultValue: 'de',
        description: 'Language being practiced',
      },
      
      // Progress metrics
      wordCount: {
        name: 'wordCount',
        type: 'number',
        required: true,
        defaultValue: 0,
        description: 'Total words written',
      },
      characterCount: {
        name: 'characterCount',
        type: 'number',
        required: true,
        defaultValue: 0,
        description: 'Total characters typed',
      },
      sentenceCount: {
        name: 'sentenceCount',
        type: 'number',
        required: false,
        defaultValue: 0,
        description: 'Number of sentences written',
      },
      paragraphCount: {
        name: 'paragraphCount',
        type: 'number',
        required: false,
        defaultValue: 0,
        description: 'Number of paragraphs',
      },
      
      // Writing behavior
      deletions: {
        name: 'deletions',
        type: 'number',
        required: false,
        defaultValue: 0,
        description: 'Number of characters deleted',
      },
      revisions: {
        name: 'revisions',
        type: 'number',
        required: false,
        defaultValue: 0,
        description: 'Number of major revisions',
      },
      pauseCount: {
        name: 'pauseCount',
        type: 'number',
        required: false,
        defaultValue: 0,
        description: 'Number of writing pauses (>10 seconds)',
      },
      
      // Content storage
      finalText: {
        name: 'finalText',
        type: 'string',
        required: true,
        defaultValue: '',
        description: 'Final written text',
      },
      drafts: {
        name: 'drafts',
        type: 'array',
        required: false,
        defaultValue: [],
        description: 'Saved drafts with timestamps',
      },
      
      // Grammar and style
      grammarErrors: {
        name: 'grammarErrors',
        type: 'number',
        required: false,
        defaultValue: 0,
        description: 'Number of grammar errors detected',
      },
      spellingErrors: {
        name: 'spellingErrors',
        type: 'number',
        required: false,
        defaultValue: 0,
        description: 'Number of spelling errors',
      },
      styleIssues: {
        name: 'styleIssues',
        type: 'number',
        required: false,
        defaultValue: 0,
        description: 'Number of style suggestions',
      },
      
      // Vocabulary
      uniqueWords: {
        name: 'uniqueWords',
        type: 'number',
        required: false,
        defaultValue: 0,
        description: 'Number of unique words used',
      },
      vocabularyLevel: {
        name: 'vocabularyLevel',
        type: 'string',
        required: false,
        description: 'Assessed vocabulary level (A1-C2)',
      },
      
      // Feedback
      aiScore: {
        name: 'aiScore',
        type: 'number',
        required: false,
        description: 'AI-generated quality score (0-100)',
      },
      feedback: {
        name: 'feedback',
        type: 'object',
        required: false,
        defaultValue: {},
        description: 'Detailed feedback on the writing',
      },
    },
    
    metrics: {
      primary: 'wordCount',
      secondary: ['sentenceCount', 'uniqueWords', 'aiScore'],
      calculated: [
        {
          name: 'writingSpeed',
          formula: 'wordCount / (duration / 60)',
        },
        {
          name: 'accuracyRate',
          formula: '100 - ((grammarErrors + spellingErrors) / wordCount * 100)',
        },
        {
          name: 'revisionRate',
          formula: 'deletions / characterCount * 100',
        },
        {
          name: 'vocabularyDiversity',
          formula: 'uniqueWords / wordCount * 100',
        },
      ],
    },
  },
  
  // Supported question types for writing sessions
  supportedQuestions: [
    QuestionTypeName.SHORT_ANSWER,
    QuestionTypeName.FILL_IN_BLANK,
    QuestionTypeName.ESSAY,
    QuestionTypeName.TRANSLATION,
    QuestionTypeName.SENTENCE_CORRECTION,
  ],
  
  features: {
    supportsTextInput: true,
    supportsDictionary: true,
    supportsNotes: true,
  },
  
  defaults: {
    targetDuration: 2400, // 40 minutes
    targetMetrics: {
      wordCount: 300,
      sentenceCount: 20,
      accuracyRate: 90,
    },
  },
  
  validation: {
    minDuration: 60, // Minimum 1 minute
    maxDuration: 14400, // Maximum 4 hours
    customRules: [
      {
        field: 'wordCount',
        rule: 'value >= 0',
        message: 'Word count must be non-negative',
      },
      {
        field: 'aiScore',
        rule: 'value >= 0 && value <= 100',
        message: 'AI score must be between 0 and 100',
      },
      {
        field: 'grammarErrors',
        rule: 'value >= 0',
        message: 'Grammar errors must be non-negative',
      },
    ],
  },
};