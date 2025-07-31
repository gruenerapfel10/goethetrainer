export interface CodeGenerationRequest {
  prompt: string;
  language: ProgrammingLanguage;
  context?: {
    existingCode?: string;
    requirements?: string[];
    framework?: string;
    style?: CodeStyle;
  };
}

export interface CodeGenerationResponse {
  code: string;
  language: ProgrammingLanguage;
  explanation: string;
  dependencies?: string[];
  warnings?: string[];
  suggestions?: CodeSuggestion[];
}

export interface DebuggingRequest {
  code: string;
  language: ProgrammingLanguage;
  error?: {
    message: string;
    stackTrace?: string;
    line?: number;
    column?: number;
  };
  expectedBehavior?: string;
  actualBehavior?: string;
}

export interface DebuggingResponse {
  issues: CodeIssue[];
  fixes: CodeFix[];
  explanation: string;
  debuggingSteps?: string[];
  preventionTips?: string[];
}

export interface CodeIssue {
  type: 'error' | 'warning' | 'performance' | 'security' | 'style';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  line?: number;
  column?: number;
  code?: string;
}

export interface CodeFix {
  issueId: string;
  description: string;
  code: string;
  explanation: string;
  confidence: number; // 0-1
}

export interface CodeSuggestion {
  type: 'optimization' | 'refactor' | 'security' | 'bestPractice';
  title: string;
  description: string;
  code?: string;
  impact: 'high' | 'medium' | 'low';
}

export interface CodeAnalysis {
  complexity: {
    cyclomatic: number;
    cognitive: number;
    lines: number;
    functions: number;
  };
  quality: {
    score: number; // 0-100
    issues: CodeIssue[];
    suggestions: CodeSuggestion[];
  };
  security: {
    vulnerabilities: SecurityVulnerability[];
    score: number; // 0-100
  };
  performance: {
    bottlenecks: PerformanceBottleneck[];
    suggestions: string[];
  };
}

export interface SecurityVulnerability {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  line?: number;
  remediation: string;
  cwe?: string; // Common Weakness Enumeration
}

export interface PerformanceBottleneck {
  type: string;
  location: {
    line: number;
    function?: string;
  };
  impact: 'high' | 'medium' | 'low';
  suggestion: string;
}

export type ProgrammingLanguage = 
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'java'
  | 'csharp'
  | 'cpp'
  | 'go'
  | 'rust'
  | 'ruby'
  | 'php'
  | 'swift'
  | 'kotlin'
  | 'scala'
  | 'r'
  | 'matlab'
  | 'sql'
  | 'html'
  | 'css'
  | 'shell'
  | 'powershell';

export type CodeStyle = 
  | 'clean'
  | 'functional'
  | 'objectOriented'
  | 'procedural'
  | 'reactive'
  | 'declarative';

export interface CodeTemplate {
  id: string;
  name: string;
  description: string;
  language: ProgrammingLanguage;
  category: string;
  code: string;
  variables?: TemplateVariable[];
  tags: string[];
}

export interface TemplateVariable {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  defaultValue?: any;
  required?: boolean;
}

export interface CodeExecutionRequest {
  code: string;
  language: ProgrammingLanguage;
  input?: string;
  timeout?: number; // milliseconds
}

export interface CodeExecutionResponse {
  output: string;
  error?: string;
  executionTime: number;
  memoryUsed: number;
  exitCode: number;
}