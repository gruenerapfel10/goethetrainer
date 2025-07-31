'use client';

import { useState } from 'react';
import { Code2, Bug, Zap, Shield, FileCode, Play, Copy, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { CodeAssistant } from '@/lib/code-assistant/code-generator';
import type { 
  ProgrammingLanguage, 
  CodeGenerationResponse, 
  DebuggingResponse,
  CodeAnalysis,
  CodeTemplate 
} from '@/lib/code-assistant/types';
// import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeAssistantProps {
  onInsertCode?: (code: string) => void;
}

export function CodeAssistantComponent({ onInsertCode }: CodeAssistantProps) {
  const [prompt, setPrompt] = useState('');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState<ProgrammingLanguage>('typescript');
  const [activeTab, setActiveTab] = useState<'generate' | 'debug' | 'analyze' | 'templates'>('generate');
  const [loading, setLoading] = useState(false);
  
  const [generationResponse, setGenerationResponse] = useState<CodeGenerationResponse | null>(null);
  const [debugResponse, setDebugResponse] = useState<DebuggingResponse | null>(null);
  const [analysisResponse, setAnalysisResponse] = useState<CodeAnalysis | null>(null);
  const [templates, setTemplates] = useState<CodeTemplate[]>([]);
  
  const codeAssistant = CodeAssistant.getInstance();

  const languages: ProgrammingLanguage[] = [
    'typescript', 'javascript', 'python', 'java', 'csharp', 'cpp', 
    'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'sql', 'html', 'css'
  ];

  const handleGenerateCode = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setLoading(true);
    try {
      const response = await codeAssistant.generateCode({
        prompt,
        language,
        context: {
          style: 'clean',
        },
      });
      
      setGenerationResponse(response);
      setCode(response.code);
      toast.success('Code generated successfully!');
    } catch (error) {
      toast.error('Failed to generate code');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDebugCode = async () => {
    if (!code.trim()) {
      toast.error('Please enter code to debug');
      return;
    }

    setLoading(true);
    try {
      const response = await codeAssistant.debugCode({
        code,
        language,
      });
      
      setDebugResponse(response);
      toast.success('Debugging analysis complete!');
    } catch (error) {
      toast.error('Failed to debug code');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeCode = async () => {
    if (!code.trim()) {
      toast.error('Please enter code to analyze');
      return;
    }

    setLoading(true);
    try {
      const response = await codeAssistant.analyzeCode(code, language);
      setAnalysisResponse(response);
      toast.success('Code analysis complete!');
    } catch (error) {
      toast.error('Failed to analyze code');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadTemplates = () => {
    const loadedTemplates = codeAssistant.getTemplates();
    setTemplates(loadedTemplates);
  };

  const handleApplyTemplate = (templateId: string) => {
    const template = codeAssistant.getTemplate(templateId);
    if (template) {
      // For demo, apply with default values
      const variables: Record<string, any> = {};
      template.variables?.forEach(v => {
        variables[v.name] = v.defaultValue || `{{${v.name}}}`;
      });
      
      const appliedCode = codeAssistant.applyTemplate(templateId, variables);
      setCode(appliedCode);
      setLanguage(template.language);
      toast.success('Template applied!');
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard!');
  };

  const handleInsertCode = () => {
    if (onInsertCode) {
      onInsertCode(code);
      toast.success('Code inserted!');
    }
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      critical: 'destructive',
      high: 'destructive',
      medium: 'secondary',
      low: 'outline',
    };
    return colors[severity as keyof typeof colors] || 'outline';
  };

  return (
    <div className="w-full space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            AI Code Assistant
          </CardTitle>
          <CardDescription>
            Generate, debug, and analyze code with AI assistance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Language Selector */}
          <div className="flex items-center gap-4">
            <Select value={language} onValueChange={(v) => setLanguage(v as ProgrammingLanguage)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang.charAt(0).toUpperCase() + lang.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyCode}
                disabled={!code}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              {onInsertCode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleInsertCode}
                  disabled={!code}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Insert
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="generate">
                <Zap className="h-4 w-4 mr-2" />
                Generate
              </TabsTrigger>
              <TabsTrigger value="debug">
                <Bug className="h-4 w-4 mr-2" />
                Debug
              </TabsTrigger>
              <TabsTrigger value="analyze">
                <Shield className="h-4 w-4 mr-2" />
                Analyze
              </TabsTrigger>
              <TabsTrigger value="templates" onClick={handleLoadTemplates}>
                <FileCode className="h-4 w-4 mr-2" />
                Templates
              </TabsTrigger>
            </TabsList>

            {/* Generate Tab */}
            <TabsContent value="generate" className="space-y-4">
              <Textarea
                placeholder="Describe what code you want to generate..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
              />
              <Button 
                onClick={handleGenerateCode} 
                disabled={loading || !prompt.trim()}
                className="w-full"
              >
                <Zap className="h-4 w-4 mr-2" />
                Generate Code
              </Button>
              
              {generationResponse && (
                <div className="space-y-4">
                  <div className="prose dark:prose-invert max-w-none">
                    <h4>Explanation:</h4>
                    <p className="text-sm text-muted-foreground">{generationResponse.explanation}</p>
                  </div>
                  
                  {generationResponse.dependencies && generationResponse.dependencies.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Dependencies:</h4>
                      <div className="flex flex-wrap gap-2">
                        {generationResponse.dependencies.map((dep, idx) => (
                          <Badge key={idx} variant="secondary">{dep}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {generationResponse.suggestions && generationResponse.suggestions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Suggestions:</h4>
                      <ul className="space-y-2">
                        {generationResponse.suggestions.map((suggestion, idx) => (
                          <li key={idx} className="text-sm">
                            <Badge variant="outline" className="mr-2">{suggestion.type}</Badge>
                            {suggestion.title}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Debug Tab */}
            <TabsContent value="debug" className="space-y-4">
              <Button 
                onClick={handleDebugCode} 
                disabled={loading || !code.trim()}
                className="w-full"
              >
                <Bug className="h-4 w-4 mr-2" />
                Debug Code
              </Button>
              
              {debugResponse && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Issues Found:</h4>
                    {debugResponse.issues.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No issues found!</p>
                    ) : (
                      <ul className="space-y-2">
                        {debugResponse.issues.map((issue, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Badge variant={getSeverityColor(issue.severity)}>
                              {issue.severity}
                            </Badge>
                            <div className="flex-1">
                              <p className="text-sm">{issue.message}</p>
                              {issue.line && (
                                <p className="text-xs text-muted-foreground">Line {issue.line}</p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  
                  {debugResponse.debuggingSteps && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Debugging Steps:</h4>
                      <ol className="list-decimal list-inside space-y-1">
                        {debugResponse.debuggingSteps.map((step, idx) => (
                          <li key={idx} className="text-sm text-muted-foreground">{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Analyze Tab */}
            <TabsContent value="analyze" className="space-y-4">
              <Button 
                onClick={handleAnalyzeCode} 
                disabled={loading || !code.trim()}
                className="w-full"
              >
                <Shield className="h-4 w-4 mr-2" />
                Analyze Code
              </Button>
              
              {analysisResponse && (
                <div className="space-y-4">
                  {/* Quality Score */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Code Quality</h4>
                    <div className="flex items-center gap-4">
                      <Progress value={analysisResponse.quality.score} className="flex-1" />
                      <span className="text-sm font-medium">{analysisResponse.quality.score}%</span>
                    </div>
                  </div>
                  
                  {/* Security Score */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Security Score</h4>
                    <div className="flex items-center gap-4">
                      <Progress value={analysisResponse.security.score} className="flex-1" />
                      <span className="text-sm font-medium">{analysisResponse.security.score}%</span>
                    </div>
                  </div>
                  
                  {/* Complexity Metrics */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Complexity Metrics</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Lines: {analysisResponse.complexity.lines}</div>
                      <div>Functions: {analysisResponse.complexity.functions}</div>
                      <div>Cyclomatic: {analysisResponse.complexity.cyclomatic}</div>
                      <div>Cognitive: {analysisResponse.complexity.cognitive}</div>
                    </div>
                  </div>
                  
                  {/* Security Vulnerabilities */}
                  {analysisResponse.security.vulnerabilities.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Security Vulnerabilities</h4>
                      <ul className="space-y-2">
                        {analysisResponse.security.vulnerabilities.map((vuln, idx) => (
                          <li key={idx} className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={getSeverityColor(vuln.severity)}>
                                {vuln.severity}
                              </Badge>
                              <span className="text-sm font-medium">{vuln.type}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{vuln.description}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Templates Tab */}
            <TabsContent value="templates" className="space-y-4">
              <div className="grid gap-4">
                {templates.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No templates available
                  </p>
                ) : (
                  templates.map((template) => (
                    <Card key={template.id} className="cursor-pointer hover:bg-accent"
                      onClick={() => handleApplyTemplate(template.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">{template.name}</CardTitle>
                          <Badge variant="outline">{template.language}</Badge>
                        </div>
                        <CardDescription className="text-xs">
                          {template.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-1">
                          {template.tags.map((tag, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Code Editor */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Code Editor</label>
            <div className="relative">
              <Textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter or paste your code here..."
                rows={12}
                className="font-mono text-sm"
              />
            </div>
          </div>

          {/* Code Preview - using pre tag for now */}
          {code && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Code Preview</label>
              <div className="rounded-md overflow-hidden border bg-muted">
                <pre className="p-4 text-sm overflow-x-auto">
                  <code className={`language-${language}`}>
                    {code}
                  </code>
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}