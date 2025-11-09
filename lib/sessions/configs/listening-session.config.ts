import { SessionTypeEnum, type SessionConfig } from '../session-registry';
import { QuestionModuleId } from '@/lib/questions/modules/types';

const defaultPlayback = {
  allowPause: true,
  allowSeek: true,
  allowRestart: true,
  allowScrubbing: true,
  allowSpeedChange: true,
} as const;

export const listeningSessionConfig: SessionConfig = {
  type: SessionTypeEnum.LISTENING,
  metadata: {
    displayName: 'Listening',
    displayNameKey: 'sessions.listening.displayName',
    description: 'Trainiere Hörverstehen mit Goethe-Zertifikat-C1-Aufgaben (Teil 1–4).',
    descriptionKey: 'sessions.listening.description',
    icon: 'headphones',
    color: 'green',
  },
  schema: {
    fields: {
      audioPlayed: {
        name: 'audioPlayed',
        type: 'number',
        required: false,
        defaultValue: 0,
        description: 'Gesamte abgespielte Hörzeit in Sekunden',
      },
      listenCount: {
        name: 'listenCount',
        type: 'number',
        required: false,
        defaultValue: 0,
        description: 'Wie oft wurden Hörtexte gestartet?',
      },
      notes: {
        name: 'notes',
        type: 'array',
        required: false,
        defaultValue: [],
        description: 'Markierungen oder Notizen zu Hörtexten',
      },
      answeredQuestions: {
        name: 'answeredQuestions',
        type: 'number',
        required: false,
        defaultValue: 0,
        description: 'Anzahl beantworteter Fragen',
      },
    },
    metrics: {
      primary: 'audioPlayed',
      secondary: ['answeredQuestions', 'listenCount'],
      calculated: [
        {
          name: 'averageSecondsPerPlay',
          formula: 'audioPlayed / Math.max(listenCount, 1)',
        },
      ],
    },
  },
  supportedModules: [QuestionModuleId.MULTIPLE_CHOICE],
  fixedLayout: [
    {
      id: 'teil_1',
      label: 'Teil 1',
      moduleId: QuestionModuleId.MULTIPLE_CHOICE,
      questionCount: 7,
      metadata: {
        points: 6,
      },
      renderOverrides: {
        layout: 'horizontal',
        showAudioControls: true,
        sourceSummary:
          'Sie hören einen Podcast über neue Bücher. Ordnen Sie zu jeder Aussage das passende Buch zu. Sie hören den Text einmal.',
      },
      sourceOverrides: {
        type: 'audio_passage',
        teilLabel: 'Teil 1',
        listeningMode: 'Podcast',
        scenario: 'Literaturpodcast – Zuordnung von Aussagen zu Buch 1/2/3',
        questionCount: 6,
        optionsPerQuestion: 3,
        conversationStyle: 'podcast',
        speakerCount: 1,
        segmentCount: 6,
        tts: {
          voiceHint: 'Podcast',
        },
        prompts: {
          transcript: 'Erstelle einen persönlichen Podcast-Monolog mit lebendigem Erzählen.',
        },
        audioAsset: {
          title: 'Literaturpodcast',
          description: 'Moderatorin spricht über drei neue Bücher.',
          durationSeconds: 360,
        },
        playback: defaultPlayback,
        styleHint:
          'Halte Aussagen knapp (10-14 Wörter) und verwende konsequent die Optionen "Buch 1", "Buch 2", "Buch 3". Die Beispielaufgabe (Frage 0) muss eindeutig markiert sein.',
      },
      scoringOverrides: {
        maxPoints: 6,
        strategy: 'single_select',
      },
    },
    {
      id: 'teil_2',
      label: 'Teil 2',
      moduleId: QuestionModuleId.MULTIPLE_CHOICE,
      questionCount: 9,
      metadata: {
        points: 9,
      },
      renderOverrides: {
        layout: 'vertical',
        showAudioControls: true,
        sourceSummary:
          'Sie hören ein Radiointerview mit einer Wissenschaftsperson zweimal. Entscheiden Sie für jede Aussage, ob sie stimmt, nicht stimmt oder nicht erwähnt wird.',
      },
      sourceOverrides: {
        type: 'audio_passage',
        teilLabel: 'Teil 2',
        listeningMode: 'Radiointerview',
        scenario: 'Interview zur Handschrift in Schule und Beruf',
        questionCount: 9,
        optionsPerQuestion: 3,
        conversationStyle: 'interview',
        speakerCount: 2,
        segmentCount: 10,
        tts: {
          voiceHint: 'Interview',
        },
        prompts: {
          transcript: 'Wechsle klar zwischen Moderator:in und Expert:in, klassisches Radiointerview.',
        },
        audioAsset: {
          title: 'Radiointerview: Handschrift 4.0',
          description: 'Gespräch zwischen Moderator und Bildungsexperte.',
          durationSeconds: 420,
        },
        playback: defaultPlayback,
        styleHint:
          'Nutze exakt die Antwortoptionen "stimmt", "stimmt nicht", "dazu wird nichts gesagt" und orientiere dich an Prüfungsaufgaben 7-15.',
      },
      scoringOverrides: {
        maxPoints: 9,
        strategy: 'single_select',
      },
    },
    {
      id: 'teil_3',
      label: 'Teil 3',
      moduleId: QuestionModuleId.MULTIPLE_CHOICE,
      questionCount: 8,
      metadata: {
        points: 8,
      },
      renderOverrides: {
        layout: 'vertical',
        showAudioControls: true,
        sourceSummary:
          'Sie hören ein Gespräch in mehreren Abschnitten jeweils einmal. Zu jedem Abschnitt beantworten Sie zwei Fragen.',
      },
      sourceOverrides: {
        type: 'audio_passage',
        teilLabel: 'Teil 3',
        listeningMode: 'Podiumsdiskussion',
        scenario: 'Stadtplaner:innen diskutieren über Wohnraum der Zukunft',
        questionCount: 8,
        optionsPerQuestion: 3,
        conversationStyle: 'dialogue',
        speakerCount: 3,
        segmentCount: 12,
        tts: {
          voiceHint: 'Dialog',
        },
        prompts: {
          transcript: 'Drei Personen tauschen sich in kurzen Sequenzen aus, inklusive Reaktionen.',
        },
        audioAsset: {
          title: 'Gespräch über Wohnen',
          description: 'Vier Stimmen diskutieren urbane Wohnkonzepte.',
          durationSeconds: 390,
        },
        playback: defaultPlayback,
        styleHint:
          'Formuliere 4 Abschnitte mit je zwei Fragen (Aussagen 16–23). Die Optionen sollen präzise politische Positionen wiedergeben.',
      },
      scoringOverrides: {
        maxPoints: 8,
        strategy: 'single_select',
      },
    },
    {
      id: 'teil_4',
      label: 'Teil 4',
      moduleId: QuestionModuleId.MULTIPLE_CHOICE,
      questionCount: 7,
      metadata: {
        points: 7,
      },
      renderOverrides: {
        layout: 'vertical',
        showAudioControls: true,
        sourceSummary:
          'Sie hören zweimal einen Vortrag zu EU-Maßnahmen. Wählen Sie jeweils die richtige Aussage A, B oder C.',
      },
      sourceOverrides: {
        type: 'audio_passage',
        teilLabel: 'Teil 4',
        listeningMode: 'Vortrag',
        scenario: 'EU-Kommission informiert über Familien- und Bildungspolitik',
        questionCount: 7,
        optionsPerQuestion: 3,
        conversationStyle: 'discussion',
        speakerCount: 4,
        segmentCount: 10,
        tts: {
          voiceHint: 'Diskussion',
        },
        prompts: {
          transcript: 'Mehrere Stimmen diskutieren kurz Statements, Moderator fasst Abschnitte zusammen.',
        },
        audioAsset: {
          title: 'EU-Vortrag',
          description: 'Vertreterin der EU erläutert neue Programme.',
          durationSeconds: 420,
        },
        playback: defaultPlayback,
        styleHint:
          'Angelehnt an Aufgaben 24–30: komplexe Aussagen mit Fokus auf Ziele, Maßnahmen und Ergebnisse.',
      },
      scoringOverrides: {
        maxPoints: 7,
        strategy: 'single_select',
      },
    },
  ],
  features: {
    supportsAudioRecording: false,
    supportsTextInput: false,
    supportsNotes: true,
  },
  defaults: {
    targetDuration: 2100,
    questionCount: 30,
    targetMetrics: {
      audioPlayed: 900,
      answeredQuestions: 30,
    },
  },
  validation: {
    minDuration: 300,
    maxDuration: 5400,
  },
};
