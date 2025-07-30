// Mock data for the dashboard

// User Adoption
export const mockUserAdoptionData = {
  totalUsers: 52,
  adoptionPercentage: 87,
  workforce: "of workforce"
};

// Messages Overview
export const mockMessagesData = {
  totalMessages: 455,
  thisWeekMessages: 98,
  percentageChange: 78,
};

// Cost Overview
export const mockCostData = {
  totalCost: 687,
  costPerUser: 13.21,
  percentageChange: 12,
  period: 'week' as const
};

// Assistant Usage
export const mockAssistantUsageData = [
  { name: 'Smart AI Assistant', value: 52, color: '#8F7CFF' },
  { name: 'Internal Data Assistant', value: 30, color: '#3BCF92' },
  { name: 'AI Research Assistant', value: 18, color: '#F9A03F' }
];

// Top Use Cases
export const mockUseCases = [
  {
    useCase: 'Customer inquiry responses',
    department: 'Customer Support',
    timeSaved: '12 mins/email'
  },
  {
    useCase: 'Sales follow-ups',
    department: 'Sales',
    timeSaved: '15 mins/email'
  },
  {
    useCase: 'HR compliance verification',
    department: 'HR',
    timeSaved: '18 mins/query'
  },
  {
    useCase: 'Product feature comparison',
    department: 'Marketing',
    timeSaved: '52 mins/research'
  },
  {
    useCase: 'Client meeting documentation',
    department: 'Client Services',
    timeSaved: '15 mins/summary'
  }
];

// Mock flagged messages with more realistic data
export const mockFlaggedMessages = [
  {
    messageId: "msg-123",
    chatTitle: "Vacation assignments",
    userEmail: "john@company.com",
    userQuery: "Who is responsible for vacation assignments?",
    content: "Vacation assignments are handled by the HR department. Please reach out to hr@company.com with your request.",
    downvotes: 1,
    createdAt: "2025-02-20T10:15:00Z"
  },
  {
    messageId: "msg-456",
    chatTitle: "Customer complaint response",
    userEmail: "beth@company.com",
    userQuery: "help me reply to following customer email about product not working",
    content: "I recommend addressing the customer's concerns with empathy and offering a clear solution path. Here's a draft response...",
    downvotes: 1,
    createdAt: "2025-02-18T14:30:00Z"
  }
];

// Mock stats
export const mockStats = {
  totalMessages: 455,
  totalUsers: 52,
  positivePercentage: 98,
  totalVotes: 200
};

// Mock user usage
export const mockUserUsage = [
  {
    email: "robin@company.com",
    messageCount: 125,
    lastActive: "2025-02-28T09:15:00Z"
  },
  {
    email: "alex@company.com",
    messageCount: 87,
    lastActive: "2025-02-28T11:30:00Z"
  },
  {
    email: "jordan@company.com",
    messageCount: 65,
    lastActive: "2025-02-27T14:45:00Z"
  },
  {
    email: "taylor@company.com",
    messageCount: 42,
    lastActive: "2025-02-26T16:20:00Z"
  }
];