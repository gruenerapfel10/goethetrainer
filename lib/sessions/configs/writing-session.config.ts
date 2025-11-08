import { SessionTypeEnum, type SessionConfig } from '../session-registry';
import { QuestionModuleId } from '@/lib/questions/modules/types';

export const writingSessionConfig: SessionConfig = {
  type: SessionTypeEnum.WRITING,
  metadata: {
    displayName: 'Writing Session',
    displayNameKey: 'sessions.writing.displayName',
    description: 'Trainiere schriftliche Aufgaben im Stil des Goethe-Zertifikats C1.',
    descriptionKey: 'sessions.writing.description',
    icon: 'pen-tool',
    color: 'purple',
  },
  schema: {
    fields: {
      wordCount: {
        name: 'wordCount',
        type: 'number',
        required: false,
        defaultValue: 0,
        description: 'Anzahl der geschriebenen Wörter während der Sitzung',
      },
    },
    metrics: {
      primary: 'wordCount',
      secondary: ['answeredQuestions', 'score'],
    },
  },
  supportedModules: [QuestionModuleId.WRITTEN_RESPONSE],
  fixedLayout: [
    {
      id: 'teil_1',
      label: 'Teil 1',
      moduleId: QuestionModuleId.WRITTEN_RESPONSE,
      questionCount: 1,
      metadata: {
        points: 10,
      },
      renderOverrides: {
        layout: 'writing',
        showSourceToggle: true,
      },
      sourceOverrides: {
        type: 'writing_prompt',
        taskKind: 'formal_letter',
        tone: 'formal',
        contextTheme: 'Leserbriefe / Bürgeranliegen',
        wordGuide: {
          min: 200,
          target: 250,
        },
      },
    },
    {
      id: 'teil_2',
      label: 'Teil 2',
      moduleId: QuestionModuleId.WRITTEN_RESPONSE,
      questionCount: 1,
      metadata: {
        points: 15,
      },
      renderOverrides: {
        layout: 'writing',
        showSourceToggle: true,
      },
      sourceOverrides: {
        type: 'writing_prompt',
        taskKind: 'opinion_article',
        tone: 'neutral',
        contextTheme: 'Beruf & Balance',
        wordGuide: {
          min: 250,
          target: 300,
        },
      },
    },
  ],
  features: {
    supportsTextInput: true,
  },
  defaults: {
    targetDuration: 2700,
    questionCount: 2,
    targetMetrics: {
      wordCount: 500,
    },
  },
  validation: {
    minDuration: 600,
    maxDuration: 5400,
  },
};
