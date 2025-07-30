export interface Memory {
  id: string;
  type: 'preference' | 'fact' | 'goal' | 'context' | 'relationship' | 'skill' | 'interest';
  content: string;
  context?: string;
  confidence: number; // 0-1
  importance: number; // 0-1
  createdAt: Date;
  updatedAt: Date;
  lastAccessed: Date;
  accessCount: number;
  tags: string[];
  sourceMessageId?: string;
  relatedMemories: string[];
  expiresAt?: Date;
}

export interface UserProfile {
  id: string;
  name: string;
  preferences: Record<string, any>;
  goals: string[];
  interests: string[];
  skills: string[];
  personality: {
    traits: Record<string, number>; // Big Five: openness, conscientiousness, extraversion, agreeableness, neuroticism
    communicationStyle: 'formal' | 'casual' | 'friendly' | 'professional' | 'technical';
    learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  };
  context: {
    timezone: string;
    location?: string;
    occupation?: string;
    currentProjects: string[];
    recentActivities: string[];
  };
  memories: Map<string, Memory>;
  totalInteractions: number;
  lastInteraction: Date;
  createdAt: Date;
}

export class AIMemorySystem {
  private static instance: AIMemorySystem;
  private userProfile: UserProfile;
  private memoryIndex: Map<string, Set<string>> = new Map(); // keyword -> memory IDs
  private decayRate = 0.95; // Memory importance decay per day

  private constructor() {
    this.userProfile = this.loadUserProfile();
    this.buildMemoryIndex();
    this.setupDecayScheduler();
  }

  static getInstance(): AIMemorySystem {
    if (!AIMemorySystem.instance) {
      AIMemorySystem.instance = new AIMemorySystem();
    }
    return AIMemorySystem.instance;
  }

  private loadUserProfile(): UserProfile {
    const stored = localStorage.getItem('ai-memory-profile');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return {
          ...parsed,
          memories: new Map(
            Object.entries(parsed.memories || {}).map(([id, memory]: [string, any]) => [
              id,
              {
                ...memory,
                createdAt: new Date(memory.createdAt),
                updatedAt: new Date(memory.updatedAt),
                lastAccessed: new Date(memory.lastAccessed),
                expiresAt: memory.expiresAt ? new Date(memory.expiresAt) : undefined,
              }
            ])
          ),
          lastInteraction: new Date(parsed.lastInteraction),
          createdAt: new Date(parsed.createdAt),
        };
      } catch (error) {
        console.error('Failed to load user profile:', error);
      }
    }

    // Create default profile
    return {
      id: 'default-user',
      name: 'User',
      preferences: {},
      goals: [],
      interests: [],
      skills: [],
      personality: {
        traits: {
          openness: 0.5,
          conscientiousness: 0.5,
          extraversion: 0.5,
          agreeableness: 0.5,
          neuroticism: 0.5,
        },
        communicationStyle: 'friendly',
        learningStyle: 'visual',
      },
      context: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        currentProjects: [],
        recentActivities: [],
      },
      memories: new Map(),
      totalInteractions: 0,
      lastInteraction: new Date(),
      createdAt: new Date(),
    };
  }

  private saveUserProfile() {
    try {
      const profileToSave = {
        ...this.userProfile,
        memories: Object.fromEntries(this.userProfile.memories),
      };
      localStorage.setItem('ai-memory-profile', JSON.stringify(profileToSave));
    } catch (error) {
      console.error('Failed to save user profile:', error);
    }
  }

  private buildMemoryIndex() {
    this.memoryIndex.clear();
    
    for (const memory of this.userProfile.memories.values()) {
      this.indexMemory(memory);
    }
  }

  private indexMemory(memory: Memory) {
    // Extract keywords from content and tags
    const keywords = [
      ...memory.content.toLowerCase().split(/\W+/).filter(word => word.length > 2),
      ...memory.tags.map(tag => tag.toLowerCase()),
      memory.type,
    ];

    keywords.forEach(keyword => {
      if (!this.memoryIndex.has(keyword)) {
        this.memoryIndex.set(keyword, new Set());
      }
      this.memoryIndex.get(keyword)!.add(memory.id);
    });
  }

  private setupDecayScheduler() {
    // Run memory decay every hour
    setInterval(() => {
      this.decayMemories();
    }, 60 * 60 * 1000);
  }

  private decayMemories() {
    const now = new Date();
    let changed = false;

    for (const memory of this.userProfile.memories.values()) {
      const daysSinceAccess = (now.getTime() - memory.lastAccessed.getTime()) / (1000 * 60 * 60 * 24);
      const decay = Math.pow(this.decayRate, daysSinceAccess);
      
      if (memory.importance > 0.1) {
        memory.importance *= decay;
        changed = true;
      }

      // Remove expired memories
      if (memory.expiresAt && now > memory.expiresAt) {
        this.userProfile.memories.delete(memory.id);
        changed = true;
      }
    }

    if (changed) {
      this.saveUserProfile();
      this.buildMemoryIndex();
    }
  }

  // Public API
  addMemory(memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt' | 'lastAccessed' | 'accessCount'>): string {
    const id = `memory-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newMemory: Memory = {
      ...memory,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 0,
    };

    this.userProfile.memories.set(id, newMemory);
    this.indexMemory(newMemory);
    this.saveUserProfile();

    return id;
  }

  updateMemory(id: string, updates: Partial<Memory>) {
    const memory = this.userProfile.memories.get(id);
    if (!memory) return;

    const updated = {
      ...memory,
      ...updates,
      updatedAt: new Date(),
    };

    this.userProfile.memories.set(id, updated);
    this.indexMemory(updated);
    this.saveUserProfile();
  }

  getMemory(id: string): Memory | undefined {
    const memory = this.userProfile.memories.get(id);
    if (memory) {
      memory.lastAccessed = new Date();
      memory.accessCount++;
      this.saveUserProfile();
    }
    return memory;
  }

  searchMemories(query: string, limit: number = 10): Memory[] {
    const keywords = query.toLowerCase().split(/\W+/).filter(word => word.length > 2);
    const memoryScores = new Map<string, number>();

    // Score memories based on keyword matches
    keywords.forEach(keyword => {
      const memoryIds = this.memoryIndex.get(keyword);
      if (memoryIds) {
        memoryIds.forEach(id => {
          const currentScore = memoryScores.get(id) || 0;
          memoryScores.set(id, currentScore + 1);
        });
      }
    });

    // Get memories and sort by relevance score
    const results = Array.from(memoryScores.entries())
      .map(([id, score]) => {
        const memory = this.userProfile.memories.get(id);
        if (!memory) return null;
        
        // Boost score by importance and recency
        const recencyBoost = 1 + (1 - (Date.now() - memory.lastAccessed.getTime()) / (1000 * 60 * 60 * 24 * 30));
        const finalScore = score * memory.importance * memory.confidence * recencyBoost;
        
        return { memory, score: finalScore };
      })
      .filter(Boolean)
      .sort((a, b) => b!.score - a!.score)
      .slice(0, limit)
      .map(item => item!.memory);

    // Update access tracking
    results.forEach(memory => {
      memory.lastAccessed = new Date();
      memory.accessCount++;
    });

    if (results.length > 0) {
      this.saveUserProfile();
    }

    return results;
  }

  analyzeMessage(messageContent: string, chatId: string): {
    relevantMemories: Memory[];
    newMemories: Omit<Memory, 'id' | 'createdAt' | 'updatedAt' | 'lastAccessed' | 'accessCount'>[];
    personalityInsights: Record<string, any>;
  } {
    const relevantMemories = this.searchMemories(messageContent, 5);
    const newMemories: Omit<Memory, 'id' | 'createdAt' | 'updatedAt' | 'lastAccessed' | 'accessCount'>[] = [];
    const personalityInsights: Record<string, any> = {};

    // Extract potential new memories from message
    const text = messageContent.toLowerCase();

    // Detect preferences
    const preferencePatterns = [
      { pattern: /i (prefer|like|love|enjoy|favor) (.+)/g, strength: 0.8 },
      { pattern: /i (hate|dislike|avoid|can't stand) (.+)/g, strength: -0.8 },
      { pattern: /my favorite (.+) is (.+)/g, strength: 0.9 },
    ];

    preferencePatterns.forEach(({ pattern, strength }) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        newMemories.push({
          type: 'preference',
          content: `User ${strength > 0 ? 'likes' : 'dislikes'} ${match[2] || match[1]}`,
          confidence: Math.abs(strength),
          importance: 0.7,
          tags: ['preference', strength > 0 ? 'positive' : 'negative'],
          sourceMessageId: chatId,
          relatedMemories: [],
        });
      }
    });

    // Detect goals
    const goalPatterns = [
      /i want to (.+)/g,
      /my goal is to (.+)/g,
      /i'm trying to (.+)/g,
      /i need to (.+)/g,
    ];

    goalPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        newMemories.push({
          type: 'goal',
          content: `User wants to ${match[1]}`,
          confidence: 0.7,
          importance: 0.8,
          tags: ['goal', 'objective'],
          sourceMessageId: chatId,
          relatedMemories: [],
        });
      }
    });

    // Detect facts about user
    const factPatterns = [
      /i am a (.+)/g,
      /i work as (.+)/g,
      /i live in (.+)/g,
      /i have (.+)/g,
      /my (.+) is (.+)/g,
    ];

    factPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        newMemories.push({
          type: 'fact',
          content: `User is/has ${match[1]}${match[2] ? ` ${match[2]}` : ''}`,
          confidence: 0.8,
          importance: 0.6,
          tags: ['fact', 'personal'],
          sourceMessageId: chatId,
          relatedMemories: [],
        });
      }
    });

    // Detect interests
    const interestPatterns = [
      /i'm interested in (.+)/g,
      /i study (.+)/g,
      /i research (.+)/g,
    ];

    interestPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        newMemories.push({
          type: 'interest',
          content: `User is interested in ${match[1]}`,
          confidence: 0.7,
          importance: 0.6,
          tags: ['interest', 'hobby'],
          sourceMessageId: chatId,
          relatedMemories: [],
        });
      }
    });

    // Update personality insights based on communication style
    const messageLength = messageContent.length;
    const questionCount = (messageContent.match(/\?/g) || []).length;
    const exclamationCount = (messageContent.match(/!/g) || []).length;
    const politenessWords = ['please', 'thank you', 'thanks', 'sorry'].filter(word => 
      text.includes(word)
    ).length;

    personalityInsights.communicationStyle = {
      verbosity: messageLength > 200 ? 'verbose' : messageLength > 50 ? 'moderate' : 'concise',
      curiosity: questionCount / Math.max(1, messageContent.split('.').length),
      enthusiasm: exclamationCount / Math.max(1, messageContent.split('.').length),
      politeness: politenessWords / Math.max(1, messageContent.split(' ').length) * 100,
    };

    // Update interaction count
    this.userProfile.totalInteractions++;
    this.userProfile.lastInteraction = new Date();

    return {
      relevantMemories,
      newMemories,
      personalityInsights,
    };
  }

  getPersonalizedContext(): string {
    const recentMemories = Array.from(this.userProfile.memories.values())
      .sort((a, b) => b.importance * b.confidence - a.importance * a.confidence)
      .slice(0, 10);

    const context = [
      `User Profile: ${this.userProfile.name}`,
      `Total interactions: ${this.userProfile.totalInteractions}`,
      `Communication style: ${this.userProfile.personality.communicationStyle}`,
      `Learning style: ${this.userProfile.personality.learningStyle}`,
    ];

    if (this.userProfile.context.occupation) {
      context.push(`Occupation: ${this.userProfile.context.occupation}`);
    }

    if (this.userProfile.context.currentProjects.length > 0) {
      context.push(`Current projects: ${this.userProfile.context.currentProjects.join(', ')}`);
    }

    if (recentMemories.length > 0) {
      context.push('\nRelevant memories:');
      recentMemories.forEach((memory, index) => {
        context.push(`${index + 1}. ${memory.content}`);
      });
    }

    return context.join('\n');
  }

  updateUserProfile(updates: Partial<UserProfile>) {
    this.userProfile = { ...this.userProfile, ...updates };
    this.saveUserProfile();
  }

  getUserProfile(): UserProfile {
    return { ...this.userProfile };
  }

  exportMemories(): string {
    const exportData = {
      profile: this.userProfile,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };

    return JSON.stringify(exportData, null, 2);
  }

  importMemories(jsonData: string) {
    try {
      const data = JSON.parse(jsonData);
      if (data.profile && data.version) {
        this.userProfile = {
          ...data.profile,
          memories: new Map(Object.entries(data.profile.memories || {})),
          lastInteraction: new Date(data.profile.lastInteraction),
          createdAt: new Date(data.profile.createdAt),
        };
        this.buildMemoryIndex();
        this.saveUserProfile();
      }
    } catch (error) {
      console.error('Failed to import memories:', error);
    }
  }

  clearMemories() {
    this.userProfile.memories.clear();
    this.memoryIndex.clear();
    this.saveUserProfile();
  }

  getMemoryStats() {
    const memories = Array.from(this.userProfile.memories.values());
    const now = new Date();

    return {
      total: memories.length,
      byType: memories.reduce((acc, memory) => {
        acc[memory.type] = (acc[memory.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      averageImportance: memories.length > 0 
        ? memories.reduce((sum, m) => sum + m.importance, 0) / memories.length 
        : 0,
      averageConfidence: memories.length > 0 
        ? memories.reduce((sum, m) => sum + m.confidence, 0) / memories.length 
        : 0,
      recentlyAccessed: memories.filter(m => 
        (now.getTime() - m.lastAccessed.getTime()) < (7 * 24 * 60 * 60 * 1000)
      ).length,
      totalAccesses: memories.reduce((sum, m) => sum + m.accessCount, 0),
    };
  }
}