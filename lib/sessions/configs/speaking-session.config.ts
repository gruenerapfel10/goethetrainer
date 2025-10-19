import { SessionTypeEnum, type SessionConfig } from '../session-registry';

export const speakingSessionConfig: SessionConfig = {
  type: SessionTypeEnum.SPEAKING,
  
  metadata: {
    displayName: 'Speaking Session',
    displayNameKey: 'sessions.speaking.displayName',
    description: 'Practice pronunciation and speaking fluency',
    descriptionKey: 'sessions.speaking.description',
    icon: 'mic',
    color: 'red',
  },
  
  schema: {
    fields: {
      // Content fields
      topic: {
        name: 'topic',
        type: 'string',
        required: false,
        description: 'Speaking topic or prompt',
      },
      exerciseType: {
        name: 'exerciseType',
        type: 'string',
        required: false,
        defaultValue: 'conversation',
        description: 'Type of speaking exercise',
      },
      targetLanguage: {
        name: 'targetLanguage',
        type: 'string',
        required: false,
        defaultValue: 'de',
        description: 'Language being practiced',
      },
      
      // Recording data
      recordingUrl: {
        name: 'recordingUrl',
        type: 'string',
        required: false,
        description: 'URL of the audio recording',
      },
      recordingDuration: {
        name: 'recordingDuration',
        type: 'number',
        required: true,
        defaultValue: 0,
        description: 'Total recording duration in seconds',
      },
      recordingSegments: {
        name: 'recordingSegments',
        type: 'array',
        required: false,
        defaultValue: [],
        description: 'Individual recording segments',
      },
      
      // Transcription
      transcription: {
        name: 'transcription',
        type: 'string',
        required: false,
        defaultValue: '',
        description: 'Transcribed text from speech',
      },
      wordCount: {
        name: 'wordCount',
        type: 'number',
        required: false,
        defaultValue: 0,
        description: 'Number of words spoken',
      },
      
      // Performance metrics
      fluencyScore: {
        name: 'fluencyScore',
        type: 'number',
        required: false,
        description: 'Fluency score (0-100)',
      },
      pronunciationScore: {
        name: 'pronunciationScore',
        type: 'number',
        required: false,
        description: 'Pronunciation accuracy (0-100)',
      },
      intonationScore: {
        name: 'intonationScore',
        type: 'number',
        required: false,
        description: 'Intonation and rhythm score (0-100)',
      },
      confidenceScore: {
        name: 'confidenceScore',
        type: 'number',
        required: false,
        description: 'Speaking confidence score (0-100)',
      },
      
      // Speaking patterns
      pauseCount: {
        name: 'pauseCount',
        type: 'number',
        required: false,
        defaultValue: 0,
        description: 'Number of significant pauses',
      },
      fillerWords: {
        name: 'fillerWords',
        type: 'number',
        required: false,
        defaultValue: 0,
        description: 'Count of filler words (um, uh, etc.)',
      },
      retakes: {
        name: 'retakes',
        type: 'number',
        required: false,
        defaultValue: 0,
        description: 'Number of retakes/restarts',
      },
      hesitations: {
        name: 'hesitations',
        type: 'number',
        required: false,
        defaultValue: 0,
        description: 'Number of hesitations',
      },
      
      // Speech rate
      speechRate: {
        name: 'speechRate',
        type: 'number',
        required: false,
        defaultValue: 0,
        description: 'Words per minute',
      },
      targetSpeechRate: {
        name: 'targetSpeechRate',
        type: 'number',
        required: false,
        defaultValue: 150,
        description: 'Target words per minute for the language',
      },
      
      // Pronunciation details
      mispronunciations: {
        name: 'mispronunciations',
        type: 'array',
        required: false,
        defaultValue: [],
        description: 'List of mispronounced words with corrections',
      },
      difficultSounds: {
        name: 'difficultSounds',
        type: 'array',
        required: false,
        defaultValue: [],
        description: 'Sounds that need practice',
      },
      
      // Feedback
      feedback: {
        name: 'feedback',
        type: 'object',
        required: false,
        defaultValue: {},
        description: 'Detailed feedback on pronunciation and fluency',
      },
    },
    
    metrics: {
      primary: 'recordingDuration',
      secondary: ['fluencyScore', 'pronunciationScore', 'speechRate'],
      calculated: [
        {
          name: 'effectiveSpeechRate',
          formula: 'wordCount / (recordingDuration / 60)',
        },
        {
          name: 'fluencyIndex',
          formula: '100 - (pauseCount + fillerWords + hesitations)',
        },
        {
          name: 'overallScore',
          formula: '(fluencyScore + pronunciationScore + intonationScore + confidenceScore) / 4',
        },
        {
          name: 'speechRateAccuracy',
          formula: '100 - Math.abs(speechRate - targetSpeechRate) / targetSpeechRate * 100',
        },
      ],
    },
  },
  
  features: {
    supportsAudioRecording: true,
    supportsNotes: true,
    supportsDictionary: true,
  },
  
  defaults: {
    targetDuration: 900, // 15 minutes
    targetMetrics: {
      recordingDuration: 600, // 10 minutes of actual speaking
      fluencyScore: 70,
      pronunciationScore: 75,
      speechRate: 150,
    },
  },
  
  validation: {
    minDuration: 30, // Minimum 30 seconds
    maxDuration: 7200, // Maximum 2 hours
    customRules: [
      {
        field: 'recordingDuration',
        rule: 'value >= 0',
        message: 'Recording duration must be non-negative',
      },
      {
        field: 'fluencyScore',
        rule: 'value >= 0 && value <= 100',
        message: 'Fluency score must be between 0 and 100',
      },
      {
        field: 'pronunciationScore',
        rule: 'value >= 0 && value <= 100',
        message: 'Pronunciation score must be between 0 and 100',
      },
      {
        field: 'speechRate',
        rule: 'value >= 0 && value <= 500',
        message: 'Speech rate must be between 0 and 500 WPM',
      },
    ],
  },
};