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
    
    if (questionTypeName === QuestionTypeName.MULTIPLE_CHOICE) {
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
      
      // Validate against schema
      try {
        validateQuestionGeneration(questionTypeName, questionData);
      } catch (error) {
        console.warn(`Validation failed for ${questionTypeName}:`, error);
      }
    }
    
    // Create the Question object
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

    // Add type-specific fields
    if (questionTypeName === QuestionTypeName.MULTIPLE_CHOICE && questionData.options) {
      question.options = questionData.options;
      question.correctAnswer = questionData.correctOptionId;
    }
    
    if (questionData.context) {
      question.context = questionData.context;
    }

    return question;
  }
  
  private mapToLegacyType(questionTypeName: QuestionTypeName, sessionType: SessionTypeEnum): QuestionType {
    // Map new registry types to legacy QuestionType enum
    switch (questionTypeName) {
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