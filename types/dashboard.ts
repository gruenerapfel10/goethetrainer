export interface DashboardStats {
  totalMessages: number;
  totalUsers: number;
  positivePercentage: number;
  totalVotes: number;
  weeklyMessages: {
    weekStart: unknown;
    count: number;
  }[];
}

export interface UserUsage {
  email: string;
  messageCount: number;
  lastActive: string;
}

export interface FlaggedMessage {
  messageId: string;
  content: string; // The assistant's response that was flagged
  chatTitle: string | null;
  userEmail: string | null;
  createdAt: string;
  downvotes: number;
  userQuery: string; // The user's message that preceded the flagged response
}
