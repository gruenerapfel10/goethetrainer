import { SessionTypeEnum, type SessionConfig } from '../session-registry';
import { QuestionModuleId } from '@/lib/questions/modules/types';
import { ReadingAssessmentCategory } from '@/lib/questions/assessment-categories';
import { LevelId } from '@/lib/levels';

export const readingSessionConfig: SessionConfig = {
  type: SessionTypeEnum.READING,
  
  metadata: {
    displayName: 'Reading',
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
  
  // Supported question modules for reading sessions
  supportedModules: [
    QuestionModuleId.MULTIPLE_CHOICE,
    QuestionModuleId.STATEMENT_MATCH,
  ],

  // Fixed layout for reading sessions (Goethe C1 exam structure)
  // Teil 1: GAP_TEXT_MULTIPLE_CHOICE (9 questions)
  // Teil 2: MULTIPLE_CHOICE (7 questions)
  // Teil 3: GAP_TEXT_MULTIPLE_CHOICE (single-line layout)
  fixedLayout: [
    {
      id: 'teil_1',
      label: 'Teil 1',
      moduleId: QuestionModuleId.MULTIPLE_CHOICE,
      sourceOverrides: {
        type: 'gapped_text',
        gapCount: undefined,
        optionsPerGap: 3,
        optionStyle: 'word',
        constructionMode: 'planned',
        categoryAllocation: {
          strategy: 'even',
          categories: [
            ReadingAssessmentCategory.FORM_GRAMMAR,
            ReadingAssessmentCategory.COHESION_CONNECTORS,
            ReadingAssessmentCategory.LEXIS_REGISTER,
            ReadingAssessmentCategory.GIST_STRUCTURE,
            ReadingAssessmentCategory.DETAIL_EVIDENCE,
            ReadingAssessmentCategory.INFERENCE_STANCE,
          ],
        },
      },
      renderOverrides: {
        layout: 'horizontal',
        showSourceToggle: true,
      },
      scoringOverrides: {
        maxPoints: 8,
        strategy: 'per_gap',
      },
    },
    {
      id: 'teil_2',
      label: 'Teil 2',
      moduleId: QuestionModuleId.MULTIPLE_CHOICE,
      questionCount: undefined,
      sourceOverrides: {
        type: 'text_passage',
        questionCount: undefined,
        optionsPerQuestion: 3,
        constructionMode: 'planned_article',
      },
      renderOverrides: {
        layout: 'vertical',
        showSourceToggle: true,
      },
      scoringOverrides: {
        maxPoints: 7,
        strategy: 'single_select',
      },
    },
    {
      id: 'teil_3',
      label: 'Teil 3',
      moduleId: QuestionModuleId.STATEMENT_MATCH,
      questionCount: 1,
      sourceOverrides: {
        type: 'statement_matching',
        constructionMode: 'planned_sentence_pool',
        gapCount: 8,
        sentencePoolSize: 10,
        includeZeroOption: false,
        startingStatementNumber: 16,
      },
      renderOverrides: {
        layout: 'statement_match',
        showSourceToggle: true,
      },
      scoringOverrides: {
        maxPoints: 8,
        strategy: 'per_gap',
      },
    },
    {
      id: 'teil_4',
      label: 'Teil 4',
      moduleId: QuestionModuleId.STATEMENT_MATCH,
      questionCount: 1,
      sourceOverrides: {
        type: 'statement_matching',
        authorCount: 4,
        statementCount: 7,
        unmatchedCount: 2,
        constructionMode: 'planned_authors',
      },
      renderOverrides: {
        showSourceToggle: true,
      },
      scoringOverrides: {
        maxPoints: 7,
        strategy: 'per_gap',
      },
    },
    // {
    //   id: 'teil_2',
    //   label: 'Teil 2',
    //   moduleId: QuestionModuleId.MULTIPLE_CHOICE,
    //   questionCount: 9,
    //   renderOverrides: {
    //     layout: 'vertical',
    //     showSourceToggle: true,
    //   },
    //   sourceOverrides: {
    //     type: 'text_passage',
    //     questionCount: 9,
    //     optionsPerQuestion: 3,
    //     categoryPlan: [
    //       ReadingAssessmentCategory.CONNECTOR_LOGIC,
    //       ReadingAssessmentCategory.LEXICAL_NUANCE,
    //       ReadingAssessmentCategory.COLLOCATION_CONTROL,
    //       ReadingAssessmentCategory.LEXICAL_NUANCE,
    //       ReadingAssessmentCategory.GRAMMAR_AGREEMENT,
    //       ReadingAssessmentCategory.CONNECTOR_LOGIC,
    //       ReadingAssessmentCategory.COLLOCATION_CONTROL,
    //       ReadingAssessmentCategory.LEXICAL_NUANCE,
    //       ReadingAssessmentCategory.CONNECTOR_LOGIC,
    //     ],
    //   },
    //   scoringOverrides: {
    //     maxPoints: 9,
    //     strategy: 'single_select',
    //   },
    // },
    // {
    //   id: 'teil_3',
    //   label: 'Teil 3',
    //   moduleId: QuestionModuleId.MULTIPLE_CHOICE,
    //   questionCount: 11,
    //   renderOverrides: {
    //     layout: 'single_statement',
    //     showSourceToggle: true,
    //   },
    //   sourceOverrides: {
    //     type: 'gapped_text',
    //     gapCount: 11,
    //     optionsPerGap: 4,
    //     optionStyle: 'statement',
    //     categoryPlan: [
    //       ReadingAssessmentCategory.LEXICAL_NUANCE,
    //       ReadingAssessmentCategory.COLLOCATION_CONTROL,
    //       ReadingAssessmentCategory.GRAMMAR_AGREEMENT,
    //       ReadingAssessmentCategory.CONNECTOR_LOGIC,
    //       ReadingAssessmentCategory.LEXICAL_NUANCE,
    //       ReadingAssessmentCategory.COLLOCATION_CONTROL,
    //       ReadingAssessmentCategory.CONNECTOR_LOGIC,
    //       ReadingAssessmentCategory.LEXICAL_NUANCE,
    //       ReadingAssessmentCategory.GRAMMAR_AGREEMENT,
    //       ReadingAssessmentCategory.COLLOCATION_CONTROL,
    //       ReadingAssessmentCategory.CONNECTOR_LOGIC,
    //     ],
    //   },
    //   scoringOverrides: {
    //     maxPoints: 11,
    //     strategy: 'per_gap',
    //   },
    // },
    // {
    //   id: 'teil_4',
    //   label: 'Teil 4',
    //   moduleId: QuestionModuleId.STATEMENT_MATCH,
    //   questionCount: 1,
    //   renderOverrides: {
    //     layout: 'statement_match',
    //     showSourceToggle: true,
    //   },
    //   sourceOverrides: {
    //     type: 'statement_matching',
    //     authorCount: 3,
    //     statementCount: 7,
    //     unmatchedCount: 0,
    //     startingStatementNumber: 24,
    //     workingTimeMinutes: 15,
    //     theme: 'Digitale Gesellschaft',
    //     topicHint: 'Privatsphäre, Sicherheit und Datenethik',
    //   },
    //   scoringOverrides: {
    //     maxPoints: 7,
    //     strategy: 'per_gap',
    //   },
    // },
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
    levelId: LevelId.C1,
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
