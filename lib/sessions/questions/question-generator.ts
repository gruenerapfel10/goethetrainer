import { generateUUID } from '@/lib/utils';
import { QuestionTypeName, getQuestionMetadata } from './question-registry';
import { AnswerType, QuestionType, QuestionDifficulty } from './question-types';
import type { Question } from './question-types';
import { SessionTypeEnum } from '../session-registry';
import { generateQuestionWithAI, generateQuestionsForSession } from './standard-generator';
import { MOCK_GAP_TEXT_MULTIPLE_CHOICE_QUESTIONS } from './mockquestions';

/**
 * Base algorithm for question generation
 */
abstract class QuestionGeneratorAlgorithm {
  abstract generate(
    questionTypeName: QuestionTypeName,
    sessionType: SessionTypeEnum,
    difficulty: QuestionDifficulty,
    index: number
  ): Promise<Question>;
}

/**
 * AI-based generator with mock fallback
 */
class AIQuestionGenerator extends QuestionGeneratorAlgorithm {
  private useAI: boolean;

  constructor(useAI: boolean = true) {
    super();
    this.useAI = useAI;
  }

  async generate(
    questionTypeName: QuestionTypeName,
    sessionType: SessionTypeEnum,
    difficulty: QuestionDifficulty,
    index: number
  ): Promise<Question> {
    const metadata = getQuestionMetadata(questionTypeName);
    const legacyType = this.mapToLegacyType(questionTypeName, sessionType);
    const answerType = this.mapToAnswerType(questionTypeName);

    let questionData: any = {};

    if (questionTypeName === QuestionTypeName.GAP_TEXT_MULTIPLE_CHOICE) {
      if (this.useAI) {
        try {
          // Generate question using AI
          questionData = await generateQuestionWithAI({
            questionType: questionTypeName,
            sessionType,
            difficulty,
            topicIndex: index - 1,
          });
        } catch (error) {
          console.error('AI generation failed, falling back to mock data:', error);
          // Fall back to mock data
          this.useAI = false;
          questionData = this.getMockQuestion(index - 1, difficulty, metadata);
        }
      } else {
        // Use mock data for debugging
        questionData = this.getMockQuestion(index - 1, difficulty, metadata);
      }
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
      // Mark first question as example with pre-filled answer
      isExample: index === 1,
      exampleAnswer: index === 1 ? questionData.correctOptionId : undefined,
    };

    // Add type-specific fields based on question type
    if (questionTypeName === QuestionTypeName.GAP_TEXT_MULTIPLE_CHOICE && questionData.options) {
      question.options = questionData.options;
      question.correctAnswer = questionData.correctOptionId;
      question.correctOptionId = questionData.correctOptionId;
      question.context = questionData.context;
    }

    return question;
  }

  private getMockQuestion(index: number, difficulty: QuestionDifficulty, metadata: any): any {
    const questionIndex = index % MOCK_GAP_TEXT_MULTIPLE_CHOICE_QUESTIONS.length;
    const selectedQuestion = MOCK_GAP_TEXT_MULTIPLE_CHOICE_QUESTIONS[questionIndex];

    return {
      prompt: selectedQuestion.prompt,
      context: selectedQuestion.context,
      options: selectedQuestion.options,
      correctOptionId: selectedQuestion.correctOptionId,
      explanation: `Diese Antwort ist basierend auf den Informationen im Text korrekt.`,
      hints: [`Lesen Sie den Text sorgfältig`, `Achten Sie auf Schlüsselwörter`],
      difficulty,
      points: metadata.defaultPoints || 10,
      timeLimit: metadata.defaultTimeLimit,
    };
  }

  private mapToLegacyType(questionTypeName: QuestionTypeName, sessionType: SessionTypeEnum): QuestionType {
    // Map new registry types to legacy QuestionType enum
    switch (questionTypeName) {
      case QuestionTypeName.GAP_TEXT_MULTIPLE_CHOICE:
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
          : AnswerType.GAP_TEXT_MULTIPLE_CHOICE;
      case 'written':
        return questionTypeName === QuestionTypeName.ESSAY
          ? AnswerType.LONG_ANSWER
          : AnswerType.SHORT_ANSWER;
      case 'audio':
        return AnswerType.GAP_TEXT_MULTIPLE_CHOICE; // Most audio questions use multiple choice
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

  constructor() {
    // Register generators
    this.registerGenerator('ai', new AIQuestionGenerator(true));
    this.registerGenerator('mock', new AIQuestionGenerator(false)); // Use mock data
  }

  registerGenerator(name: string, generator: QuestionGeneratorAlgorithm): void {
    this.generators.set(name, generator);
  }

  getGenerator(name: string = 'ai'): QuestionGeneratorAlgorithm {
    const generator = this.generators.get(name);
    if (!generator) {
      throw new Error(`Generator "${name}" not found. Available generators: ${Array.from(this.generators.keys()).join(', ')}`);
    }
    return generator;
  }

  async generateQuestions(
    sessionType: SessionTypeEnum,
    difficulty: QuestionDifficulty = QuestionDifficulty.INTERMEDIATE,
    count: number = 1,
    generatorName: string = 'ai'
  ): Promise<Question[]> {
    // If using AI and count is 9 for reading session, use session generation
    if (generatorName === 'ai' && count === 9 && sessionType === SessionTypeEnum.READING) {
      try {
        const sessionQuestions = await generateQuestionsForSession(sessionType, difficulty, count);

        // Convert session questions to Question objects
        const questions: Question[] = [];
        for (let i = 0; i < sessionQuestions.length; i++) {
          const questionData = sessionQuestions[i];
          const metadata = getQuestionMetadata(QuestionTypeName.GAP_TEXT_MULTIPLE_CHOICE);

          const question: Question = {
            id: generateUUID(),
            type: this.mapToLegacyType(QuestionTypeName.GAP_TEXT_MULTIPLE_CHOICE, sessionType),
            sessionType,
            difficulty,
            answerType: this.mapToAnswerType(QuestionTypeName.GAP_TEXT_MULTIPLE_CHOICE),
            prompt: questionData.prompt,
            context: questionData.context,
            title: questionData.title,
            subtitle: questionData.subtitle,
            theme: questionData.theme,
            options: questionData.options,
            correctAnswer: questionData.correctOptionId,
            correctOptionId: questionData.correctOptionId,
            points: questionData.points || metadata.defaultPoints || 10,
            timeLimit: questionData.timeLimit || metadata.defaultTimeLimit || 60,
            explanation: questionData.explanation,
            isExample: questionData.isExample || false,
            exampleAnswer: questionData.exampleAnswer,
            scoringCriteria: {
              requireExactMatch: true,
              acceptPartialCredit: false,
              keywords: [],
            },
            registryType: QuestionTypeName.GAP_TEXT_MULTIPLE_CHOICE,
          };

          questions.push(question);
        }

        return questions;
      } catch (error) {
        console.error('Session generation failed, falling back to individual generation:', error);
        // Fall through to individual generation
      }
    }

    // Original individual generation logic
    const generator = this.getGenerator(generatorName);
    const questions: Question[] = [];

    // Get supported question types for this session
    const supportedTypes = getQuestionsForSession(sessionType);

    if (supportedTypes.length === 0) {
      console.warn(`No supported question types for session type: ${sessionType}`);
      return [];
    }

    // Generate questions in parallel for better performance
    const promises: Promise<Question>[] = [];
    for (let i = 1; i <= count; i++) {
      // For now, only use GAP_TEXT_MULTIPLE_CHOICE since that's what we've configured
      const questionType = QuestionTypeName.GAP_TEXT_MULTIPLE_CHOICE;
      promises.push(generator.generate(questionType, sessionType, difficulty, i));
    }

    try {
      const results = await Promise.all(promises);
      return results;
    } catch (error) {
      console.error('Error generating questions:', error);
      // Try sequential generation as fallback
      for (let i = 1; i <= count; i++) {
        try {
          const questionType = QuestionTypeName.GAP_TEXT_MULTIPLE_CHOICE;
          const question = await generator.generate(questionType, sessionType, difficulty, i);
          questions.push(question);
        } catch (err) {
          console.error(`Failed to generate question ${i}:`, err);
        }
      }
      return questions;
    }
  }

  private mapToLegacyType(questionTypeName: QuestionTypeName, sessionType: SessionTypeEnum): QuestionType {
    // Map new registry types to legacy QuestionType enum
    switch (questionTypeName) {
      case QuestionTypeName.GAP_TEXT_MULTIPLE_CHOICE:
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
          : AnswerType.GAP_TEXT_MULTIPLE_CHOICE;
      case 'written':
        return questionTypeName === QuestionTypeName.ESSAY
          ? AnswerType.LONG_ANSWER
          : AnswerType.SHORT_ANSWER;
      case 'audio':
        return AnswerType.GAP_TEXT_MULTIPLE_CHOICE; // Most audio questions use multiple choice
      case 'spoken':
        return AnswerType.AUDIO_RECORDING;
      default:
        return AnswerType.SHORT_ANSWER;
    }
  }
}

// Singleton instance
const questionGeneratorRegistry = new QuestionGeneratorRegistry();

/**
 * Generate questions for a session
 */
export async function generateQuestions(
  sessionType: SessionTypeEnum,
  difficulty: QuestionDifficulty = QuestionDifficulty.INTERMEDIATE,
  count: number = 1,
  useAI: boolean = true
): Promise<Question[]> {
  const generatorName = useAI ? 'ai' : 'mock';
  return questionGeneratorRegistry.generateQuestions(sessionType, difficulty, count, generatorName);
}

/**
 * Generate questions using mock data (for debugging)
 */
export async function generateMockQuestions(
  sessionType: SessionTypeEnum,
  difficulty: QuestionDifficulty = QuestionDifficulty.INTERMEDIATE,
  count: number = 1
): Promise<Question[]> {
  return questionGeneratorRegistry.generateQuestions(sessionType, difficulty, count, 'mock');
}

/**
 * Get supported question types for a session
 */
function getQuestionsForSession(sessionType: SessionTypeEnum): QuestionTypeName[] {
  const { getSessionConfig } = require('../session-registry');
  const config = getSessionConfig(sessionType);
  return config.supportedQuestions || [];
}
