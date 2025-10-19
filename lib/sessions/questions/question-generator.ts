import { SessionTypeEnum } from '../session-registry';
import { 
  Question, 
  QuestionType, 
  QuestionDifficulty, 
  AnswerType,
  QuestionOption 
} from './question-types';
import { generateUUID } from '@/lib/utils';
import { 
  QuestionTypeName, 
  getQuestionsForSession, 
  getQuestionMetadata,
  validateQuestionGeneration 
} from './question-registry';

/**
 * Centralized question generation algorithms
 * This can be easily swapped out or modified without touching the main code
 */

export interface QuestionGeneratorConfig {
  sessionType: SessionTypeEnum;
  difficulty: QuestionDifficulty;
  count: number;
  topics?: string[];
  previousQuestions?: string[]; // To avoid repetition
}

export interface QuestionGeneratorAlgorithm {
  name: string;
  version: string;
  generate(config: QuestionGeneratorConfig): Question[];
}

/**
 * Registry-based question generator using question metadata
 */
class RegistryBasedQuestionGenerator implements QuestionGeneratorAlgorithm {
  name = 'registry-based';
  version = '2.0.0';

  generate(config: QuestionGeneratorConfig): Question[] {
    const questions: Question[] = [];
    
    // Get supported question types for this session
    const supportedTypes = getQuestionsForSession(config.sessionType);
    
    if (supportedTypes.length === 0) {
      throw new Error(`No question types available for session type ${config.sessionType}`);
    }
    
    // Use random selection for now
    for (let i = 0; i < config.count; i++) {
      const randomType = supportedTypes[Math.floor(Math.random() * supportedTypes.length)];
      questions.push(this.generateQuestionFromRegistry(
        randomType, 
        config.sessionType, 
        config.difficulty, 
        i + 1
      ));
    }
    
    return questions;
  }

  private generateQuestionFromRegistry(
    questionTypeName: QuestionTypeName,
    sessionType: SessionTypeEnum, 
    difficulty: QuestionDifficulty,
    index: number
  ): Question {
    const metadata = getQuestionMetadata(questionTypeName);
    
    // Map registry question type to legacy QuestionType enum
    const legacyType = this.mapToLegacyType(questionTypeName, sessionType);
    const answerType = this.mapToAnswerType(questionTypeName);
    
    // Generate placeholder content based on question type
    let questionData: any = {};
    
    // Goethe C1 Reading Question Types
    if (questionTypeName === QuestionTypeName.GAP_TEXT_MULTIPLE_CHOICE) {
      questionData = {
        prompt: `Lesen Sie den Text und ergänzen Sie die Lücken.`,
        context: `Der Klimawandel ist eine der größten [GAP_1] unserer Zeit. Die steigenden Temperaturen führen zu [GAP_2] Wetterphänomenen, die immer häufiger auftreten. Wissenschaftler warnen, dass ohne sofortige [GAP_3] die Folgen irreversibel sein könnten. Viele Länder haben sich daher zu [GAP_4] Klimazielen verpflichtet.`,
        gaps: [
          {
            id: 'GAP_1',
            options: ['Herausforderungen', 'Möglichkeiten', 'Erfolge', 'Traditionen'],
            correctAnswer: 'Herausforderungen'
          },
          {
            id: 'GAP_2',
            options: ['normalen', 'extremen', 'seltenen', 'bekannten'],
            correctAnswer: 'extremen'
          },
          {
            id: 'GAP_3',
            options: ['Diskussionen', 'Verzögerungen', 'Maßnahmen', 'Studien'],
            correctAnswer: 'Maßnahmen'
          },
          {
            id: 'GAP_4',
            options: ['vagen', 'ehrgeizigen', 'einfachen', 'theoretischen'],
            correctAnswer: 'ehrgeizigen'
          }
        ],
        explanation: `Die richtigen Antworten ergeben sich aus dem Kontext und der Bedeutung des Textes.`,
        hints: [`Achten Sie auf den Kontext der Lücken`, `Überlegen Sie, welches Wort grammatikalisch und inhaltlich passt`],
        difficulty,
        points: metadata.defaultPoints || 4,
        timeLimit: metadata.defaultTimeLimit || 300,
      };
    } else if (questionTypeName === QuestionTypeName.MULTIPLE_CHOICE_3) {
      questionData = {
        prompt: `Was ist die Hauptaussage des Textes?`,
        context: `Die Digitalisierung verändert unsere Arbeitswelt fundamental. Während einige Berufe verschwinden, entstehen gleichzeitig neue Tätigkeitsfelder. Experten betonen, dass lebenslanges Lernen wichtiger denn je wird, um mit diesem Wandel Schritt zu halten.`,
        options: [
          { id: 'a', label: 'a)', text: 'Die Digitalisierung führt zu Arbeitslosigkeit und sollte gestoppt werden.', isCorrect: false },
          { id: 'b', label: 'b)', text: 'Der Arbeitsmarkt wandelt sich durch Digitalisierung, was kontinuierliche Weiterbildung erfordert.', isCorrect: true },
          { id: 'c', label: 'c)', text: 'Experten sind sich uneinig über die Auswirkungen der Digitalisierung.', isCorrect: false }
        ],
        correctAnswer: 'b',
        explanation: `Option b) fasst die Hauptaussage korrekt zusammen: Wandel durch Digitalisierung und Bedeutung des lebenslangen Lernens.`,
        hints: [`Identifizieren Sie die zentrale Botschaft`, `Achten Sie auf Schlüsselbegriffe`],
        difficulty,
        points: metadata.defaultPoints || 3,
        timeLimit: metadata.defaultTimeLimit || 120,
      };
    } else if (questionTypeName === QuestionTypeName.GAP_TEXT_MATCHING) {
      questionData = {
        prompt: `Ordnen Sie die Sätze den passenden Lücken im Text zu.`,
        context: `Die Geschichte der Menschheit ist geprägt von bedeutenden Erfindungen. [GAP_1] Diese Entwicklung hatte weitreichende Folgen für die Gesellschaft. [GAP_2] Heute stehen wir vor ähnlich revolutionären Veränderungen. [GAP_3] Die Zukunft wird zeigen, welche Auswirkungen diese haben werden.`,
        gaps: ['GAP_1', 'GAP_2', 'GAP_3'],
        sentences: [
          { id: 'sent_1', text: 'Die Erfindung des Buchdrucks im 15. Jahrhundert war ein Meilenstein.' },
          { id: 'sent_2', text: 'Bildung wurde für breitere Bevölkerungsschichten zugänglich.' },
          { id: 'sent_3', text: 'Künstliche Intelligenz und Quantencomputer könnten unser Leben grundlegend verändern.' },
          { id: 'sent_4', text: 'Viele Wissenschaftler forschen an neuen Technologien.' }
        ],
        correctMatches: {
          'GAP_1': 'sent_1',
          'GAP_2': 'sent_2',
          'GAP_3': 'sent_3'
        },
        explanation: `Die Sätze müssen logisch und chronologisch in den Textfluss passen.`,
        hints: [`Achten Sie auf zeitliche Abfolgen`, `Beachten Sie Konnektoren und Verweise`],
        difficulty,
        points: metadata.defaultPoints || 3,
        timeLimit: metadata.defaultTimeLimit || 240,
      };
    } else if (questionTypeName === QuestionTypeName.STATEMENT_MATCHING) {
      questionData = {
        prompt: `Welche Aussage passt zu welchem Text?`,
        texts: [
          {
            id: 'text_a',
            label: 'Text A',
            content: 'Die Stadtbibliothek erweitert ihre digitalen Angebote. Ab nächstem Monat können Mitglieder E-Books und Hörbücher über eine neue App ausleihen. Die Nutzung ist für alle Mitglieder kostenlos.'
          },
          {
            id: 'text_b',
            label: 'Text B',
            content: 'Das Fitnessstudio "FitPlus" bietet neue Kurse an. Besonders beliebt sind die Yoga-Stunden am Morgen. Mitglieder erhalten 20% Rabatt auf Personal Training.'
          },
          {
            id: 'text_c',
            label: 'Text C',
            content: 'Der Supermarkt "BioFrisch" hat sein Sortiment erweitert. Neben regionalen Produkten gibt es jetzt auch eine große Auswahl an veganen Alternativen. Die Preise sind moderat.'
          }
        ],
        statements: [
          { id: 'stmt_1', text: 'Hier können Sie Geld sparen, wenn Sie bereits Kunde sind.' },
          { id: 'stmt_2', text: 'Diese Einrichtung modernisiert ihre Dienstleistungen.' },
          { id: 'stmt_3', text: 'Hier finden Sie Produkte für spezielle Ernährungsformen.' },
          { id: 'stmt_4', text: 'Morgendliche Aktivitäten sind besonders gefragt.' }
        ],
        correctMatches: {
          'stmt_1': 'text_b',
          'stmt_2': 'text_a',
          'stmt_3': 'text_c',
          'stmt_4': 'text_b'
        },
        explanation: `Jede Aussage bezieht sich auf spezifische Informationen in einem der Texte.`,
        hints: [`Suchen Sie nach Schlüsselwörtern`, `Achten Sie auf Details in den Texten`],
        difficulty,
        points: metadata.defaultPoints || 4,
        timeLimit: metadata.defaultTimeLimit || 300,
      };
    } else if (questionTypeName === QuestionTypeName.MULTIPLE_CHOICE) {
      questionData = {
        prompt: `Question ${index}: Select the best answer for this ${difficulty} comprehension question.`,
        context: sessionType === SessionTypeEnum.READING 
          ? `This is a reading passage for question ${index}. The passage contains important information about the topic.`
          : undefined,
        options: [
          { id: 'option_1', text: `Option A for question ${index}`, isCorrect: true },
          { id: 'option_2', text: `Option B for question ${index}`, isCorrect: false },
          { id: 'option_3', text: `Option C for question ${index}`, isCorrect: false },
          { id: 'option_4', text: `Option D for question ${index}`, isCorrect: false },
        ],
        correctOptionId: 'option_1',
        explanation: `Option A is correct because it accurately reflects the information presented.`,
        hints: [`Look for key words in the passage`, `Consider the context carefully`],
        difficulty,
        points: metadata.defaultPoints || 10,
        timeLimit: metadata.defaultTimeLimit,
      };
    }
    
    // Validate against schema
    try {
      if (questionData.prompt) {
        validateQuestionGeneration(questionTypeName, questionData);
      }
    } catch (error) {
      console.warn(`Validation failed for ${questionTypeName}:`, error);
    }
    
    // Create the Question object with all necessary data
    const question: Question = {
      id: generateUUID(),
      type: legacyType,
      sessionType,
      difficulty,
      answerType,
      prompt: questionData.prompt || `Question ${index}: ${metadata.description}`,
      points: questionData.points || metadata.defaultPoints || this.calculatePoints(difficulty),
      timeLimit: questionData.timeLimit || metadata.defaultTimeLimit || 60,
      hints: questionData.hints,
      explanation: questionData.explanation || `This is the explanation for question ${index}.`,
      scoringCriteria: {
        requireExactMatch: metadata.markingMethod === 'automatic',
        acceptPartialCredit: metadata.supportsPartialCredit || false,
        keywords: questionData.keywords || [],
      },
      // Store registry type for future reference
      registryType: questionTypeName,
    };

    // Add type-specific fields based on question type
    if (questionTypeName === QuestionTypeName.GAP_TEXT_MULTIPLE_CHOICE && questionData.gaps) {
      question.gaps = questionData.gaps;
      question.context = questionData.context;
    } else if (questionTypeName === QuestionTypeName.MULTIPLE_CHOICE_3 && questionData.options) {
      question.options = questionData.options;
      question.correctAnswer = questionData.correctAnswer;
      question.context = questionData.context;
    } else if (questionTypeName === QuestionTypeName.GAP_TEXT_MATCHING) {
      question.gaps = questionData.gaps;
      question.sentences = questionData.sentences;
      question.correctMatches = questionData.correctMatches;
      question.context = questionData.context;
    } else if (questionTypeName === QuestionTypeName.STATEMENT_MATCHING) {
      question.texts = questionData.texts;
      question.statements = questionData.statements;
      question.correctMatches = questionData.correctMatches;
    } else if (questionTypeName === QuestionTypeName.MULTIPLE_CHOICE && questionData.options) {
      question.options = questionData.options;
      question.correctAnswer = questionData.correctOptionId;
    }
    
    if (questionData.context && !question.context) {
      question.context = questionData.context;
    }

    return question;
  }
  
  private mapToLegacyType(questionTypeName: QuestionTypeName, sessionType: SessionTypeEnum): QuestionType {
    // Map new registry types to legacy QuestionType enum
    switch (questionTypeName) {
      // Goethe C1 Reading types
      case QuestionTypeName.GAP_TEXT_MULTIPLE_CHOICE:
      case QuestionTypeName.MULTIPLE_CHOICE_3:
      case QuestionTypeName.GAP_TEXT_MATCHING:
      case QuestionTypeName.STATEMENT_MATCHING:
        return QuestionType.READING_COMPREHENSION;
      // Legacy types
      case QuestionTypeName.MULTIPLE_CHOICE:
        return sessionType === SessionTypeEnum.READING 
          ? QuestionType.READING_COMPREHENSION 
          : QuestionType.LISTENING_COMPREHENSION;
      case QuestionTypeName.TRUE_FALSE:
        return QuestionType.READING_COMPREHENSION;
      case QuestionTypeName.SHORT_ANSWER:
        return sessionType === SessionTypeEnum.READING
          ? QuestionType.READING_VOCABULARY
          : QuestionType.WRITING_GRAMMAR;
      case QuestionTypeName.ESSAY:
        return QuestionType.WRITING_PROMPT;
      case QuestionTypeName.TRANSLATION:
        return QuestionType.WRITING_TRANSLATION;
      case QuestionTypeName.PRONUNCIATION:
        return QuestionType.SPEAKING_PRONUNCIATION;
      case QuestionTypeName.CONVERSATION:
        return QuestionType.SPEAKING_CONVERSATION;
      default:
        return QuestionType.READING_COMPREHENSION;
    }
  }
  
  private mapToAnswerType(questionTypeName: QuestionTypeName): AnswerType {
    const metadata = getQuestionMetadata(questionTypeName);
    
    switch (metadata.category) {
      case 'selection':
        return questionTypeName === QuestionTypeName.TRUE_FALSE 
          ? AnswerType.TRUE_FALSE 
          : AnswerType.MULTIPLE_CHOICE;
      case 'written':
        return questionTypeName === QuestionTypeName.ESSAY 
          ? AnswerType.LONG_ANSWER 
          : AnswerType.SHORT_ANSWER;
      case 'audio':
        return AnswerType.MULTIPLE_CHOICE; // Most audio questions use multiple choice
      case 'spoken':
        return AnswerType.AUDIO_RECORDING;
      default:
        return AnswerType.SHORT_ANSWER;
    }
  }

  private calculatePoints(difficulty: QuestionDifficulty): number {
    switch (difficulty) {
      case QuestionDifficulty.BEGINNER:
        return 10;
      case QuestionDifficulty.INTERMEDIATE:
        return 20;
      case QuestionDifficulty.ADVANCED:
        return 30;
      default:
        return 10;
    }
  }
}

/**
 * Question Generator Registry - allows swapping algorithms
 */
class QuestionGeneratorRegistry {
  private generators: Map<string, QuestionGeneratorAlgorithm> = new Map();
  private activeGenerator: string = 'registry-based';

  constructor() {
    // Register generators
    this.register('registry-based', new RegistryBasedQuestionGenerator());
  }

  register(name: string, generator: QuestionGeneratorAlgorithm) {
    this.generators.set(name, generator);
  }

  setActiveGenerator(name: string) {
    if (!this.generators.has(name)) {
      throw new Error(`Generator ${name} not found`);
    }
    this.activeGenerator = name;
  }

  getGenerator(): QuestionGeneratorAlgorithm {
    const generator = this.generators.get(this.activeGenerator);
    if (!generator) {
      throw new Error('No active generator');
    }
    return generator;
  }

  generateQuestions(config: QuestionGeneratorConfig): Question[] {
    return this.getGenerator().generate(config);
  }
}

// Global instance
export const questionGenerator = new QuestionGeneratorRegistry();

// Helper function for easy access
export function generateQuestions(
  sessionType: SessionTypeEnum,
  difficulty: QuestionDifficulty = QuestionDifficulty.INTERMEDIATE,
  count: number = 10
): Question[] {
  return questionGenerator.generateQuestions({
    sessionType,
    difficulty,
    count
  });
}