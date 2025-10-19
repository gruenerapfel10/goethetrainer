import { SessionTypeEnum, type SessionConfig } from '../session-registry';
import { QuestionTypeName } from '../questions/question-registry';

export const listeningSessionConfig: SessionConfig = {
  type: SessionTypeEnum.LISTENING,
  
  metadata: {
    displayName: 'Listening Session',
    displayNameKey: 'sessions.listening.displayName',
    description: 'Improve your listening comprehension and pronunciation',
    descriptionKey: 'sessions.listening.description',
    icon: 'headphones',
    color: 'purple',
  },
  
  schema: {
    fields: {
      // Content fields
      audioId: {
        name: 'audioId',
        type: 'string',
        required: false,
        description: 'ID of the audio content',
      },
      audioTitle: {
        name: 'audioTitle',
        type: 'string',
        required: false,
        description: 'Title of the audio content',
      },
      audioUrl: {
        name: 'audioUrl',
        type: 'string',
        required: false,
        description: 'URL of the audio file',
      },
      audioLanguage: {
        name: 'audioLanguage',
        type: 'string',
        required: false,
        defaultValue: 'de',
        description: 'Language of the audio',
      },
      
      // Playback metrics
      playbackSpeed: {
        name: 'playbackSpeed',
        type: 'number',
        required: true,
        defaultValue: 1.0,
        description: 'Playback speed multiplier',
      },
      totalListeningTime: {
        name: 'totalListeningTime',
        type: 'number',
        required: true,
        defaultValue: 0,
        description: 'Total time spent listening (in seconds)',
      },
      completedSegments: {
        name: 'completedSegments',
        type: 'number',
        required: false,
        defaultValue: 0,
        description: 'Number of audio segments completed',
      },
      
      // Interaction metrics
      pauseCount: {
        name: 'pauseCount',
        type: 'number',
        required: false,
        defaultValue: 0,
        description: 'Number of times paused',
      },
      rewindCount: {
        name: 'rewindCount',
        type: 'number',
        required: false,
        defaultValue: 0,
        description: 'Number of times rewound',
      },
      repeatCount: {
        name: 'repeatCount',
        type: 'number',
        required: false,
        defaultValue: 0,
        description: 'Number of times repeated sections',
      },
      
      // Comprehension features
      notes: {
        name: 'notes',
        type: 'array',
        required: false,
        defaultValue: [],
        description: 'Timestamped notes',
      },
      transcriptHighlights: {
        name: 'transcriptHighlights',
        type: 'array',
        required: false,
        defaultValue: [],
        description: 'Highlighted transcript sections',
      },
      vocabularyItems: {
        name: 'vocabularyItems',
        type: 'array',
        required: false,
        defaultValue: [],
        description: 'New vocabulary learned',
      },
      
      // Assessment
      comprehensionScore: {
        name: 'comprehensionScore',
        type: 'number',
        required: false,
        description: 'Comprehension test score (0-100)',
      },
      pronunciationScore: {
        name: 'pronunciationScore',
        type: 'number',
        required: false,
        description: 'Pronunciation accuracy score (0-100)',
      },
    },
    
    metrics: {
      primary: 'totalListeningTime',
      secondary: ['completedSegments', 'comprehensionScore', 'vocabularyItems'],
      calculated: [
        {
          name: 'effectiveListeningTime',
          formula: 'totalListeningTime / playbackSpeed',
        },
        {
          name: 'interactionRate',
          formula: '(pauseCount + rewindCount + repeatCount) / (duration / 60)',
        },
        {
          name: 'focusScore',
          formula: '100 - (pauseCount * 2)',
        },
      ],
    },
  },
  
  // Supported question types for listening sessions
  supportedQuestions: [
    QuestionTypeName.GAP_TEXT_MULTIPLE_CHOICE,
    QuestionTypeName.TRUE_FALSE,
    QuestionTypeName.AUDIO_COMPREHENSION,
    QuestionTypeName.DICTATION,
  ],
  
  features: {
    supportsAudioRecording: true,
    supportsFileUpload: true,
    supportsNotes: true,
    supportsDictionary: true,
  },
  
  defaults: {
    targetDuration: 1200, // 20 minutes
    targetMetrics: {
      totalListeningTime: 900, // 15 minutes of actual listening
      completedSegments: 3,
      comprehensionScore: 75,
    },
  },
  
  validation: {
    minDuration: 60, // Minimum 1 minute
    maxDuration: 10800, // Maximum 3 hours
    customRules: [
      {
        field: 'playbackSpeed',
        rule: 'value >= 0.5 && value <= 2.0',
        message: 'Playback speed must be between 0.5x and 2x',
      },
      {
        field: 'totalListeningTime',
        rule: 'value >= 0',
        message: 'Listening time must be non-negative',
      },
      {
        field: 'comprehensionScore',
        rule: 'value >= 0 && value <= 100',
        message: 'Comprehension score must be between 0 and 100',
      },
    ],
  },
};