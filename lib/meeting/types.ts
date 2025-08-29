export interface Meeting {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
  participants: Participant[];
  transcript: TranscriptSegment[];
  summary?: MeetingSummary;
  actionItems: ActionItem[];
  decisions: Decision[];
  recording?: Recording;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  created: Date;
  updated: Date;
}

export interface Participant {
  id: string;
  name: string;
  email?: string;
  role?: string;
  joinedAt?: Date;
  leftAt?: Date;
  speakingTime?: number; // seconds
  avatar?: string;
}

export interface TranscriptSegment {
  id: string;
  speaker: string;
  speakerId?: string;
  text: string;
  timestamp: Date;
  duration: number; // seconds
  confidence?: number; // 0-1
  language?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  keywords?: string[];
}

export interface MeetingSummary {
  overview: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: string[];
  nextSteps: string[];
  sentiment: {
    overall: 'positive' | 'neutral' | 'negative';
    distribution: {
      positive: number;
      neutral: number;
      negative: number;
    };
  };
  topics: Topic[];
  generatedAt: Date;
}

export interface Topic {
  name: string;
  duration: number; // seconds
  segments: string[]; // transcript segment IDs
  importance: 'low' | 'medium' | 'high';
  keywords: string[];
}

export interface ActionItem {
  id: string;
  title: string;
  description?: string;
  assignee?: string;
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: Date;
  completedAt?: Date;
}

export interface Decision {
  id: string;
  title: string;
  description: string;
  madeBy?: string;
  timestamp: Date;
  impact: 'low' | 'medium' | 'high';
  category?: string;
}

export interface Recording {
  url: string;
  duration: number; // seconds
  format: 'audio' | 'video';
  size: number; // bytes
  quality: 'low' | 'medium' | 'high';
}

export interface TranscriptionConfig {
  language: string;
  enablePunctuation: boolean;
  enableSpeakerDiarization: boolean;
  maxSpeakers?: number;
  vocabularyFilter?: string[];
  customVocabulary?: string[];
  enableRealtime: boolean;
  interim: boolean;
}

export interface MeetingAnalytics {
  totalDuration: number;
  speakingTimeDistribution: {
    participantId: string;
    name: string;
    duration: number;
    percentage: number;
  }[];
  topicDistribution: {
    topic: string;
    duration: number;
    percentage: number;
  }[];
  sentimentTrend: {
    timestamp: Date;
    sentiment: number; // -1 to 1
  }[];
  participationRate: number; // 0-1
  interruptionCount: number;
  questionCount: number;
}

export interface MeetingTemplate {
  id: string;
  name: string;
  description?: string;
  agenda: AgendaItem[];
  defaultDuration: number; // minutes
  remindersBefore: number[]; // minutes
  tags: string[];
}

export interface AgendaItem {
  id: string;
  title: string;
  description?: string;
  duration: number; // minutes
  presenter?: string;
  order: number;
}