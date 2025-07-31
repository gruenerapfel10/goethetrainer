import {
  Meeting,
  TranscriptSegment,
  TranscriptionConfig,
  MeetingSummary,
  ActionItem,
  Decision,
  Topic,
  MeetingAnalytics,
} from './types';
import { generateUUID } from '@/lib/utils';

export class TranscriptionService {
  private static instance: TranscriptionService;
  private recognition: any;
  private isTranscribing: boolean = false;
  private currentMeeting: Meeting | null = null;
  private interimTranscript: string = '';
  private finalTranscript: string = '';
  private lastSpeakerChange: Date = new Date();
  private currentSpeaker: string = 'Speaker 1';
  private speakerCount: number = 1;
  
  private constructor() {
    this.initializeSpeechRecognition();
  }
  
  static getInstance(): TranscriptionService {
    if (!TranscriptionService.instance) {
      TranscriptionService.instance = new TranscriptionService();
    }
    return TranscriptionService.instance;
  }

  private initializeSpeechRecognition() {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
      
      this.recognition.onresult = this.handleSpeechResult.bind(this);
      this.recognition.onerror = this.handleSpeechError.bind(this);
      this.recognition.onend = this.handleSpeechEnd.bind(this);
    }
  }

  startTranscription(meeting: Meeting, config: TranscriptionConfig) {
    if (!this.recognition) {
      throw new Error('Speech recognition not supported');
    }

    this.currentMeeting = meeting;
    this.isTranscribing = true;
    this.recognition.lang = config.language || 'en-US';
    
    try {
      this.recognition.start();
    } catch (error) {
      console.error('Failed to start transcription:', error);
      this.isTranscribing = false;
    }
  }

  stopTranscription() {
    if (this.recognition && this.isTranscribing) {
      this.recognition.stop();
      this.isTranscribing = false;
    }
  }

  private handleSpeechResult(event: any) {
    if (!this.currentMeeting) return;

    const results = event.results;
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < results.length; i++) {
      const transcript = results[i][0].transcript;
      if (results[i].isFinal) {
        finalTranscript += transcript + ' ';
      } else {
        interimTranscript += transcript;
      }
    }

    if (finalTranscript) {
      // Detect speaker change (simplified)
      const now = new Date();
      if (now.getTime() - this.lastSpeakerChange.getTime() > 5000) {
        this.speakerCount++;
        this.currentSpeaker = `Speaker ${this.speakerCount}`;
        this.lastSpeakerChange = now;
      }

      const segment: TranscriptSegment = {
        id: generateUUID(),
        speaker: this.currentSpeaker,
        text: finalTranscript.trim(),
        timestamp: new Date(),
        duration: 0, // Would calculate based on audio
        confidence: results[event.resultIndex][0].confidence || 0.9,
        language: this.recognition.lang,
        sentiment: this.analyzeSentiment(finalTranscript),
        keywords: this.extractKeywords(finalTranscript),
      };

      this.currentMeeting.transcript.push(segment);
      this.analyzeForActionItems(segment);
      this.analyzeForDecisions(segment);
    }

    this.interimTranscript = interimTranscript;
    this.finalTranscript = finalTranscript;
  }

  private handleSpeechError(event: any) {
    console.error('Speech recognition error:', event.error);
    if (event.error === 'no-speech') {
      // Restart recognition after silence
      setTimeout(() => {
        if (this.isTranscribing) {
          this.recognition.start();
        }
      }, 1000);
    }
  }

  private handleSpeechEnd() {
    if (this.isTranscribing) {
      // Restart recognition to continue transcribing
      setTimeout(() => {
        if (this.isTranscribing) {
          this.recognition.start();
        }
      }, 100);
    }
  }

  private analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
    // Simple sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'happy', 'pleased', 'wonderful', 'fantastic'];
    const negativeWords = ['bad', 'poor', 'terrible', 'unhappy', 'disappointed', 'awful', 'horrible'];
    
    const lowerText = text.toLowerCase();
    let score = 0;
    
    positiveWords.forEach(word => {
      if (lowerText.includes(word)) score++;
    });
    
    negativeWords.forEach(word => {
      if (lowerText.includes(word)) score--;
    });
    
    if (score > 0) return 'positive';
    if (score < 0) return 'negative';
    return 'neutral';
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction
    const stopWords = ['the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'as', 'are', 'been', 'be', 'have', 'has', 'had', 'was', 'were'];
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.includes(word));
    
    // Count word frequency
    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });
    
    // Return top keywords
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  private analyzeForActionItems(segment: TranscriptSegment) {
    if (!this.currentMeeting) return;
    
    const actionKeywords = ['action', 'todo', 'task', 'will do', 'need to', 'should', 'must', 'have to', 'assign'];
    const text = segment.text.toLowerCase();
    
    if (actionKeywords.some(keyword => text.includes(keyword))) {
      const actionItem: ActionItem = {
        id: generateUUID(),
        title: this.extractActionTitle(segment.text),
        assignee: segment.speaker,
        priority: 'medium',
        status: 'pending',
        createdAt: new Date(),
      };
      
      this.currentMeeting.actionItems.push(actionItem);
    }
  }

  private analyzeForDecisions(segment: TranscriptSegment) {
    if (!this.currentMeeting) return;
    
    const decisionKeywords = ['decided', 'decision', 'agree', 'approved', 'confirmed', 'resolved', 'concluded'];
    const text = segment.text.toLowerCase();
    
    if (decisionKeywords.some(keyword => text.includes(keyword))) {
      const decision: Decision = {
        id: generateUUID(),
        title: this.extractDecisionTitle(segment.text),
        description: segment.text,
        madeBy: segment.speaker,
        timestamp: new Date(),
        impact: 'medium',
      };
      
      this.currentMeeting.decisions.push(decision);
    }
  }

  private extractActionTitle(text: string): string {
    // Extract a concise title from the action text
    const cleaned = text.replace(/^(i will|we need to|should|must|have to)\s+/i, '');
    const words = cleaned.split(' ').slice(0, 5);
    return words.join(' ') + (words.length < cleaned.split(' ').length ? '...' : '');
  }

  private extractDecisionTitle(text: string): string {
    // Extract a concise title from the decision text
    const cleaned = text.replace(/^(we decided|it was decided|agreed to|approved)\s+/i, '');
    const words = cleaned.split(' ').slice(0, 5);
    return words.join(' ') + (words.length < cleaned.split(' ').length ? '...' : '');
  }

  async generateSummary(meeting: Meeting): Promise<MeetingSummary> {
    const transcript = meeting.transcript;
    
    // Extract key points
    const keyPoints = this.extractKeyPoints(transcript);
    
    // Analyze topics
    const topics = this.analyzeTopics(transcript);
    
    // Calculate sentiment
    const sentimentDistribution = this.calculateSentimentDistribution(transcript);
    
    const summary: MeetingSummary = {
      overview: this.generateOverview(meeting, transcript),
      keyPoints,
      decisions: meeting.decisions.map(d => d.title),
      actionItems: meeting.actionItems.map(a => `${a.title} (${a.assignee})`),
      nextSteps: this.generateNextSteps(meeting),
      sentiment: {
        overall: this.getOverallSentiment(sentimentDistribution),
        distribution: sentimentDistribution,
      },
      topics,
      generatedAt: new Date(),
    };
    
    return summary;
  }

  private extractKeyPoints(transcript: TranscriptSegment[]): string[] {
    // Extract important points based on keywords and emphasis
    const keyPoints: string[] = [];
    const importantKeywords = ['important', 'key', 'critical', 'essential', 'main', 'significant'];
    
    transcript.forEach(segment => {
      const hasImportantKeyword = importantKeywords.some(keyword => 
        segment.text.toLowerCase().includes(keyword)
      );
      
      if (hasImportantKeyword || segment.keywords?.length > 3) {
        keyPoints.push(segment.text.substring(0, 100) + '...');
      }
    });
    
    return keyPoints.slice(0, 5); // Top 5 key points
  }

  private analyzeTopics(transcript: TranscriptSegment[]): Topic[] {
    // Group segments by topics based on keywords
    const topicMap = new Map<string, string[]>();
    
    transcript.forEach(segment => {
      segment.keywords?.forEach(keyword => {
        if (!topicMap.has(keyword)) {
          topicMap.set(keyword, []);
        }
        topicMap.get(keyword)!.push(segment.id);
      });
    });
    
    // Convert to Topic objects
    const topics: Topic[] = Array.from(topicMap.entries())
      .map(([keyword, segmentIds]) => ({
        name: keyword.charAt(0).toUpperCase() + keyword.slice(1),
        duration: segmentIds.length * 10, // Estimated
        segments: segmentIds,
        importance: segmentIds.length > 5 ? 'high' : segmentIds.length > 2 ? 'medium' : 'low',
        keywords: [keyword],
      }))
      .sort((a, b) => b.segments.length - a.segments.length)
      .slice(0, 5); // Top 5 topics
    
    return topics;
  }

  private calculateSentimentDistribution(transcript: TranscriptSegment[]) {
    const distribution = {
      positive: 0,
      neutral: 0,
      negative: 0,
    };
    
    transcript.forEach(segment => {
      if (segment.sentiment) {
        distribution[segment.sentiment]++;
      }
    });
    
    const total = transcript.length || 1;
    return {
      positive: (distribution.positive / total) * 100,
      neutral: (distribution.neutral / total) * 100,
      negative: (distribution.negative / total) * 100,
    };
  }

  private getOverallSentiment(distribution: any): 'positive' | 'neutral' | 'negative' {
    if (distribution.positive > 50) return 'positive';
    if (distribution.negative > 30) return 'negative';
    return 'neutral';
  }

  private generateOverview(meeting: Meeting, transcript: TranscriptSegment[]): string {
    const duration = meeting.endTime 
      ? Math.floor((meeting.endTime.getTime() - meeting.startTime.getTime()) / 60000)
      : 0;
    
    return `Meeting "${meeting.title}" lasted ${duration} minutes with ${meeting.participants.length} participants. ` +
           `${transcript.length} transcript segments were recorded, resulting in ${meeting.decisions.length} decisions ` +
           `and ${meeting.actionItems.length} action items.`;
  }

  private generateNextSteps(meeting: Meeting): string[] {
    const nextSteps: string[] = [];
    
    // Add pending action items
    meeting.actionItems
      .filter(item => item.status === 'pending')
      .forEach(item => {
        nextSteps.push(`Complete: ${item.title}`);
      });
    
    // Add follow-up suggestions
    if (meeting.decisions.length > 0) {
      nextSteps.push('Review and distribute meeting decisions');
    }
    
    if (meeting.transcript.length > 50) {
      nextSteps.push('Share detailed meeting summary with participants');
    }
    
    return nextSteps;
  }

  calculateAnalytics(meeting: Meeting): MeetingAnalytics {
    const duration = meeting.endTime 
      ? (meeting.endTime.getTime() - meeting.startTime.getTime()) / 1000
      : 0;
    
    // Calculate speaking time distribution
    const speakingTime = new Map<string, number>();
    meeting.transcript.forEach(segment => {
      const time = speakingTime.get(segment.speaker) || 0;
      speakingTime.set(segment.speaker, time + (segment.duration || 5));
    });
    
    const totalSpeakingTime = Array.from(speakingTime.values()).reduce((a, b) => a + b, 0) || 1;
    const speakingTimeDistribution = Array.from(speakingTime.entries()).map(([speaker, time]) => ({
      participantId: speaker,
      name: speaker,
      duration: time,
      percentage: (time / totalSpeakingTime) * 100,
    }));
    
    // Calculate topic distribution
    const topics = this.analyzeTopics(meeting.transcript);
    const topicDistribution = topics.map(topic => ({
      topic: topic.name,
      duration: topic.duration,
      percentage: (topic.duration / duration) * 100,
    }));
    
    // Calculate sentiment trend
    const sentimentTrend = meeting.transcript.map(segment => ({
      timestamp: segment.timestamp,
      sentiment: segment.sentiment === 'positive' ? 1 : segment.sentiment === 'negative' ? -1 : 0,
    }));
    
    // Count questions
    const questionCount = meeting.transcript.filter(segment => 
      segment.text.includes('?')
    ).length;
    
    return {
      totalDuration: duration,
      speakingTimeDistribution,
      topicDistribution,
      sentimentTrend,
      participationRate: speakingTimeDistribution.length / meeting.participants.length,
      interruptionCount: 0, // Would need audio analysis
      questionCount,
    };
  }

  // Get current transcription status
  getTranscriptionStatus() {
    return {
      isTranscribing: this.isTranscribing,
      currentMeeting: this.currentMeeting,
      interimTranscript: this.interimTranscript,
      finalTranscript: this.finalTranscript,
    };
  }
}