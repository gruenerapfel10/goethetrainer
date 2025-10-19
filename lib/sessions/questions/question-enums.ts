/**
 * Question type enums - kept separate to avoid circular dependencies
 */

export enum QuestionTypeName {
  // Reading question types
  GAP_TEXT_MULTIPLE_CHOICE = 'gap_text_multiple_choice',

  // Future question types (to be implemented)
  TRUE_FALSE = 'true_false',
  SHORT_ANSWER = 'short_answer',
  FILL_IN_BLANK = 'fill_in_blank',

  // Writing question types
  ESSAY = 'essay',
  TRANSLATION = 'translation',
  SENTENCE_CORRECTION = 'sentence_correction',

  // Listening question types
  AUDIO_COMPREHENSION = 'audio_comprehension',
  DICTATION = 'dictation',

  // Speaking question types
  PRONUNCIATION = 'pronunciation',
  CONVERSATION = 'conversation',
  ORAL_PRESENTATION = 'oral_presentation',
}

// Marking method for questions
export enum MarkingMethod {
  MANUAL = 'manual', // Teacher/human marks manually
  AUTOMATIC = 'automatic', // System marks automatically (e.g., multiple choice)
  AI_ASSISTED = 'ai_assisted', // AI marks with criteria
}