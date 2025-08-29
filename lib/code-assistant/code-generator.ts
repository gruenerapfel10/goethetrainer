import {
  CodeGenerationRequest,
  CodeGenerationResponse,
  DebuggingRequest,
  DebuggingResponse,
  CodeAnalysis,
  CodeIssue,
  CodeFix,
  CodeSuggestion,
  SecurityVulnerability,
  PerformanceBottleneck,
  ProgrammingLanguage,
  CodeTemplate,
} from './types';
import { generateUUID } from '@/lib/utils';

export class CodeAssistant {
  private static instance: CodeAssistant;
  private templates: Map<string, CodeTemplate> = new Map();
  private codeHistory: Map<string, { request: CodeGenerationRequest; response: CodeGenerationResponse }[]> = new Map();

  private constructor() {
    this.loadTemplates();
  }

  static getInstance(): CodeAssistant {
    if (!CodeAssistant.instance) {
      CodeAssistant.instance = new CodeAssistant();
    }
    return CodeAssistant.instance;
  }

  private loadTemplates() {
    // Load built-in templates
    const templates: CodeTemplate[] = [
      {
        id: 'react-component',
        name: 'React Component',
        description: 'Modern React functional component with TypeScript',
        language: 'typescript',
        category: 'frontend',
        code: `import React from 'react';

interface {{ComponentName}}Props {
  {{props}}
}

export const {{ComponentName}}: React.FC<{{ComponentName}}Props> = ({ {{propsList}} }) => {
  return (
    <div className="{{className}}">
      {{content}}
    </div>
  );
};`,
        variables: [
          { name: 'ComponentName', description: 'Component name', type: 'string', required: true },
          { name: 'props', description: 'Props interface', type: 'string', defaultValue: '' },
          { name: 'propsList', description: 'Props destructuring', type: 'string', defaultValue: '' },
          { name: 'className', description: 'CSS class name', type: 'string', defaultValue: '' },
          { name: 'content', description: 'Component content', type: 'string', defaultValue: '// Your content here' },
        ],
        tags: ['react', 'component', 'typescript'],
      },
      {
        id: 'express-api',
        name: 'Express API Endpoint',
        description: 'RESTful API endpoint with Express.js',
        language: 'javascript',
        category: 'backend',
        code: `router.{{method}}('{{path}}', async (req, res) => {
  try {
    {{validation}}
    
    {{logic}}
    
    res.status({{successCode}}).json({
      success: true,
      data: {{responseData}}
    });
  } catch (error) {
    res.status({{errorCode}}).json({
      success: false,
      error: error.message
    });
  }
});`,
        variables: [
          { name: 'method', description: 'HTTP method', type: 'string', defaultValue: 'get' },
          { name: 'path', description: 'API path', type: 'string', required: true },
          { name: 'validation', description: 'Request validation', type: 'string', defaultValue: '// Validate request' },
          { name: 'logic', description: 'Business logic', type: 'string', defaultValue: '// Business logic' },
          { name: 'successCode', description: 'Success status code', type: 'number', defaultValue: 200 },
          { name: 'responseData', description: 'Response data', type: 'string', defaultValue: 'result' },
          { name: 'errorCode', description: 'Error status code', type: 'number', defaultValue: 500 },
        ],
        tags: ['express', 'api', 'rest'],
      },
    ];

    templates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  async generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResponse> {
    // Simulate AI code generation
    const { prompt, language, context } = request;
    
    // Generate code based on language and prompt
    const code = this.generateCodeForLanguage(language, prompt, context);
    const explanation = this.generateExplanation(code, language);
    const dependencies = this.detectDependencies(code, language);
    const suggestions = this.generateSuggestions(code, language);

    const response: CodeGenerationResponse = {
      code,
      language,
      explanation,
      dependencies,
      suggestions,
    };

    // Store in history
    const sessionId = generateUUID();
    if (!this.codeHistory.has(sessionId)) {
      this.codeHistory.set(sessionId, []);
    }
    this.codeHistory.get(sessionId)!.push({ request, response });

    return response;
  }

  async debugCode(request: DebuggingRequest): Promise<DebuggingResponse> {
    const { code, language, error, expectedBehavior, actualBehavior } = request;
    
    // Analyze code for issues
    const issues = this.analyzeCodeIssues(code, language, error);
    const fixes = this.generateFixes(issues, code, language);
    const explanation = this.explainIssues(issues, fixes);
    const debuggingSteps = this.generateDebuggingSteps(issues, language);
    const preventionTips = this.generatePreventionTips(issues);

    return {
      issues,
      fixes,
      explanation,
      debuggingSteps,
      preventionTips,
    };
  }

  async analyzeCode(code: string, language: ProgrammingLanguage): Promise<CodeAnalysis> {
    // Analyze code complexity
    const complexity = this.calculateComplexity(code, language);
    
    // Analyze code quality
    const qualityIssues = this.analyzeCodeQuality(code, language);
    const qualitySuggestions = this.generateQualitySuggestions(code, language);
    const qualityScore = this.calculateQualityScore(qualityIssues);
    
    // Analyze security
    const vulnerabilities = this.findSecurityVulnerabilities(code, language);
    const securityScore = this.calculateSecurityScore(vulnerabilities);
    
    // Analyze performance
    const bottlenecks = this.findPerformanceBottlenecks(code, language);
    const performanceSuggestions = this.generatePerformanceSuggestions(bottlenecks);

    return {
      complexity,
      quality: {
        score: qualityScore,
        issues: qualityIssues,
        suggestions: qualitySuggestions,
      },
      security: {
        vulnerabilities,
        score: securityScore,
      },
      performance: {
        bottlenecks,
        suggestions: performanceSuggestions,
      },
    };
  }

  private generateCodeForLanguage(
    language: ProgrammingLanguage,
    prompt: string,
    context?: CodeGenerationRequest['context']
  ): string {
    // Simulate code generation based on language
    const templates: Record<ProgrammingLanguage, string> = {
      javascript: `// ${prompt}
function solution() {
  // Implementation here
  return result;
}`,
      typescript: `// ${prompt}
interface Result {
  // Define result type
}

function solution(): Result {
  // Implementation here
  return {} as Result;
}`,
      python: `# ${prompt}
def solution():
    """
    Implementation for: ${prompt}
    """
    # Implementation here
    return result`,
      java: `// ${prompt}
public class Solution {
    public static void main(String[] args) {
        // Implementation here
    }
}`,
      // Add more language templates...
    } as Record<ProgrammingLanguage, string>;

    return templates[language] || `// ${prompt}\n// Code implementation for ${language}`;
  }

  private generateExplanation(code: string, language: ProgrammingLanguage): string {
    return `This ${language} code implements the requested functionality. The code follows best practices and includes proper error handling.`;
  }

  private detectDependencies(code: string, language: ProgrammingLanguage): string[] {
    const dependencies: string[] = [];
    
    // Simple dependency detection
    if (language === 'javascript' || language === 'typescript') {
      const importRegex = /import .* from ['"](.+)['"]/g;
      const requireRegex = /require\(['"](.+)['"]\)/g;
      
      let match;
      while ((match = importRegex.exec(code)) !== null) {
        dependencies.push(match[1]);
      }
      while ((match = requireRegex.exec(code)) !== null) {
        dependencies.push(match[1]);
      }
    }
    
    return [...new Set(dependencies)];
  }

  private generateSuggestions(code: string, language: ProgrammingLanguage): CodeSuggestion[] {
    const suggestions: CodeSuggestion[] = [];
    
    // Add language-specific suggestions
    if (code.includes('var ') && (language === 'javascript' || language === 'typescript')) {
      suggestions.push({
        type: 'bestPractice',
        title: 'Use const/let instead of var',
        description: 'Replace var declarations with const or let for better scoping',
        impact: 'medium',
      });
    }
    
    return suggestions;
  }

  private analyzeCodeIssues(
    code: string,
    language: ProgrammingLanguage,
    error?: DebuggingRequest['error']
  ): CodeIssue[] {
    const issues: CodeIssue[] = [];
    
    // Check for common issues
    if (error) {
      issues.push({
        type: 'error',
        severity: 'critical',
        message: error.message,
        line: error.line,
        column: error.column,
      });
    }
    
    // Language-specific checks
    if (language === 'javascript' || language === 'typescript') {
      // Check for common JS issues
      if (code.includes('==') && !code.includes('===')) {
        issues.push({
          type: 'warning',
          severity: 'medium',
          message: 'Use === instead of == for strict equality',
        });
      }
    }
    
    return issues;
  }

  private generateFixes(issues: CodeIssue[], code: string, language: ProgrammingLanguage): CodeFix[] {
    return issues.map((issue, index) => ({
      issueId: `issue-${index}`,
      description: `Fix for: ${issue.message}`,
      code: code, // In real implementation, would provide fixed code
      explanation: `This fix addresses the ${issue.type} by implementing best practices`,
      confidence: 0.85,
    }));
  }

  private explainIssues(issues: CodeIssue[], fixes: CodeFix[]): string {
    if (issues.length === 0) {
      return 'No issues found in the code.';
    }
    
    return `Found ${issues.length} issue(s) in the code. ${fixes.length} fix(es) are available.`;
  }

  private generateDebuggingSteps(issues: CodeIssue[], language: ProgrammingLanguage): string[] {
    const steps: string[] = [];
    
    steps.push('1. Review the error message and stack trace');
    steps.push('2. Check variable values at the error location');
    steps.push('3. Add console.log/print statements for debugging');
    steps.push('4. Use a debugger to step through the code');
    steps.push('5. Verify input data and edge cases');
    
    return steps;
  }

  private generatePreventionTips(issues: CodeIssue[]): string[] {
    const tips: string[] = [];
    
    tips.push('Write unit tests for your code');
    tips.push('Use type checking (TypeScript, type hints)');
    tips.push('Implement proper error handling');
    tips.push('Follow coding standards and best practices');
    tips.push('Use linting tools to catch issues early');
    
    return tips;
  }

  private calculateComplexity(code: string, language: ProgrammingLanguage) {
    // Simple complexity calculation
    const lines = code.split('\n').length;
    const functions = (code.match(/function|=>/g) || []).length;
    
    return {
      cyclomatic: Math.min(10, functions + 1),
      cognitive: Math.min(20, lines / 10),
      lines,
      functions,
    };
  }

  private analyzeCodeQuality(code: string, language: ProgrammingLanguage): CodeIssue[] {
    const issues: CodeIssue[] = [];
    
    // Check for code quality issues
    if (code.length > 1000) {
      issues.push({
        type: 'warning',
        severity: 'medium',
        message: 'Function/file is too long. Consider breaking it down.',
      });
    }
    
    return issues;
  }

  private generateQualitySuggestions(code: string, language: ProgrammingLanguage): CodeSuggestion[] {
    return [
      {
        type: 'refactor',
        title: 'Consider extracting reusable functions',
        description: 'Break down complex logic into smaller, reusable functions',
        impact: 'medium',
      },
    ];
  }

  private calculateQualityScore(issues: CodeIssue[]): number {
    const severityWeights = {
      critical: 25,
      high: 15,
      medium: 10,
      low: 5,
    };
    
    let deductions = 0;
    issues.forEach(issue => {
      deductions += severityWeights[issue.severity];
    });
    
    return Math.max(0, 100 - deductions);
  }

  private findSecurityVulnerabilities(code: string, language: ProgrammingLanguage): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];
    
    // Check for common security issues
    if (code.includes('eval(')) {
      vulnerabilities.push({
        type: 'Code Injection',
        severity: 'critical',
        description: 'Use of eval() can lead to code injection vulnerabilities',
        remediation: 'Avoid using eval(). Use JSON.parse() for JSON data or safer alternatives.',
        cwe: 'CWE-94',
      });
    }
    
    if (code.includes('innerHTML')) {
      vulnerabilities.push({
        type: 'XSS',
        severity: 'high',
        description: 'Direct use of innerHTML can lead to XSS vulnerabilities',
        remediation: 'Use textContent or sanitize HTML content before insertion.',
        cwe: 'CWE-79',
      });
    }
    
    return vulnerabilities;
  }

  private calculateSecurityScore(vulnerabilities: SecurityVulnerability[]): number {
    const severityWeights = {
      critical: 40,
      high: 25,
      medium: 15,
      low: 10,
    };
    
    let deductions = 0;
    vulnerabilities.forEach(vuln => {
      deductions += severityWeights[vuln.severity];
    });
    
    return Math.max(0, 100 - deductions);
  }

  private findPerformanceBottlenecks(code: string, language: ProgrammingLanguage): PerformanceBottleneck[] {
    const bottlenecks: PerformanceBottleneck[] = [];
    
    // Check for performance issues
    const nestedLoops = code.match(/for.*\{[\s\S]*?for/g) || [];
    if (nestedLoops.length > 0) {
      bottlenecks.push({
        type: 'Nested Loops',
        location: { line: 1 }, // Would calculate actual line in real implementation
        impact: 'high',
        suggestion: 'Consider optimizing nested loops or using more efficient algorithms',
      });
    }
    
    return bottlenecks;
  }

  private generatePerformanceSuggestions(bottlenecks: PerformanceBottleneck[]): string[] {
    const suggestions: string[] = [];
    
    if (bottlenecks.some(b => b.type === 'Nested Loops')) {
      suggestions.push('Use Map/Set for O(1) lookups instead of nested loops');
      suggestions.push('Consider using array methods like filter/map for better readability');
    }
    
    suggestions.push('Profile your code to identify actual performance bottlenecks');
    suggestions.push('Use caching for expensive operations');
    
    return suggestions;
  }

  // Template management
  getTemplates(): CodeTemplate[] {
    return Array.from(this.templates.values());
  }

  getTemplate(id: string): CodeTemplate | undefined {
    return this.templates.get(id);
  }

  applyTemplate(templateId: string, variables: Record<string, any>): string {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }
    
    let code = template.code;
    
    // Replace variables
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      code = code.replace(regex, value);
    });
    
    return code;
  }
}