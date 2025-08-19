'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  Save, 
  Download, 
  Upload,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Code,
  Sparkles,
  Zap,
  Eye,
  Edit3,
  FileImage
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  wordCount: number;
  aiSuggestions: string[];
}

export function SmartDocumentEditor() {
  const [isOpen, setIsOpen] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentDoc, setCurrentDoc] = useState<Document | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    if (content.length > 50) {
      generateAISuggestions();
    }
  }, [content]);

  const loadDocuments = () => {
    const stored = localStorage.getItem('smart-documents');
    if (stored) {
      const parsed = JSON.parse(stored);
      setDocuments(parsed.map((doc: any) => ({
        ...doc,
        createdAt: new Date(doc.createdAt),
        updatedAt: new Date(doc.updatedAt),
      })));
    }
  };

  const saveDocuments = (docs: Document[]) => {
    localStorage.setItem('smart-documents', JSON.stringify(docs));
  };

  const createNewDocument = () => {
    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      title: 'Untitled Document',
      content: '',
      createdAt: new Date(),
      updatedAt: new Date(), 
      wordCount: 0,
      aiSuggestions: [],
    };
    
    setCurrentDoc(newDoc);
    setTitle(newDoc.title);
    setContent(newDoc.content);
    setAiSuggestions([]);
  };

  const saveDocument = () => {
    if (!currentDoc) return;

    const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
    
    const updatedDoc: Document = {
      ...currentDoc,
      title: title || 'Untitled Document',
      content,
      updatedAt: new Date(),
      wordCount,
      aiSuggestions,
    };

    const existingIndex = documents.findIndex(doc => doc.id === currentDoc.id);
    let updatedDocs;
    
    if (existingIndex >= 0) {
      updatedDocs = [...documents];
      updatedDocs[existingIndex] = updatedDoc;
    } else {
      updatedDocs = [...documents, updatedDoc];
    }
    
    setDocuments(updatedDocs);
    saveDocuments(updatedDocs);
    setCurrentDoc(updatedDoc);
  };

  const openDocument = (doc: Document) => {
    setCurrentDoc(doc);
    setTitle(doc.title);
    setContent(doc.content);
    setAiSuggestions(doc.aiSuggestions);
  };

  const exportDocument = () => {
    if (!currentDoc) return;
    
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title || 'document'}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const insertText = (beforeText: string, afterText: string = '') => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    const newText = content.substring(0, start) + 
                   beforeText + selectedText + afterText + 
                   content.substring(end);
    
    setContent(newText);
    
    // Reset cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + beforeText.length,
        start + beforeText.length + selectedText.length
      );
    }, 0);
  };

  const generateAISuggestions = async () => {
    setIsGenerating(true);
    
    // Simulate AI suggestion generation
    setTimeout(() => {
      const suggestions = [
        "Consider adding more specific examples to strengthen your argument",
        "This paragraph could benefit from a smoother transition",
        "Try using more active voice to make your writing more engaging",
        "Add a conclusion that summarizes your key points",
        "Consider breaking this long paragraph into smaller ones for better readability",
      ];
      
      setAiSuggestions(suggestions.slice(0, 3));
      setIsGenerating(false);
    }, 1500);
  };

  const applySuggestion = (suggestion: string) => {
    // Simulate applying AI suggestion
    setContent(prev => prev + '\n\n[AI Enhancement: ' + suggestion + ']');
  };

  const renderPreview = (text: string) => {
    // Simple markdown-like rendering
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/__(.*?)__/g, '<u>$1</u>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/\n/g, '<br>');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <FileText className="h-4 w-4" />
          Documents
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-7xl max-h-[95vh] p-0">
        <div className="flex h-[90vh]">
          {/* Sidebar */}
          <div className="w-64 border-r bg-muted/50 p-4">
            <div className="flex items-center justify-between mb-4">
              <DialogTitle className="text-lg font-semibold">Documents</DialogTitle>
              <Button onClick={createNewDocument} size="sm">
                <FileText className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className={cn(
                    "p-3 rounded-lg cursor-pointer transition-colors",
                    currentDoc?.id === doc.id ? "bg-primary/10 border border-primary/20" : "bg-background hover:bg-muted"
                  )}
                  onClick={() => openDocument(doc)}
                >
                  <h4 className="font-medium text-sm truncate">{doc.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {doc.wordCount} words • {doc.updatedAt.toLocaleDateString()}
                  </p>
                </div>
              ))}
              
              {documents.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No documents yet</p>
                  <p className="text-xs">Create your first document</p>
                </div>
              )}
            </div>
          </div>

          {/* Main Editor */}
          <div className="flex-1 flex flex-col">
            {currentDoc ? (
              <>
                {/* Toolbar */}
                <div className="flex items-center justify-between p-4 border-b">
                  <div className="flex items-center gap-4">
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="font-semibold text-lg border-none shadow-none p-0 h-auto"
                      placeholder="Document title..."
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {content.trim().split(/\s+/).filter(word => word.length > 0).length} words
                    </Badge>
                    
                    <Tabs value={isPreview ? "preview" : "edit"} onValueChange={(value) => setIsPreview(value === "preview")}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="edit" className="gap-2">
                          <Edit3 className="h-4 w-4" />
                          Edit
                        </TabsTrigger>
                        <TabsTrigger value="preview" className="gap-2">
                          <Eye className="h-4 w-4" />
                          Preview
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                    
                    <Button onClick={saveDocument} size="sm">
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    
                    <Button onClick={exportDocument} variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Formatting Toolbar */}
                {!isPreview && (
                  <div className="flex items-center gap-2 p-4 border-b bg-muted/30">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => insertText('**', '**')}
                    >
                      <Bold className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => insertText('*', '*')}
                    >
                      <Italic className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => insertText('__', '__')}
                    >
                      <Underline className="h-4 w-4" />
                    </Button>
                    
                    <Separator orientation="vertical" className="h-6 mx-2" />
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => insertText('# ', '')}
                    >
                      H1
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => insertText('## ', '')}
                    >
                      H2
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => insertText('### ', '')}
                    >
                      H3
                    </Button>
                    
                    <Separator orientation="vertical" className="h-6 mx-2" />
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => insertText('- ', '')}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm" 
                      onClick={() => insertText('1. ', '')}
                    >
                      <ListOrdered className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => insertText('> ', '')}
                    >
                      <Quote className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => insertText('`', '`')}
                    >
                      <Code className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Content Area */}
                <div className="flex-1 flex">
                  <div className="flex-1 p-4">
                    {isPreview ? (
                      <div 
                        className="prose max-w-none h-full overflow-y-auto"
                        dangerouslySetInnerHTML={{ __html: renderPreview(content) }}
                      />
                    ) : (
                      <Textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Start writing your document..."
                        className="w-full h-full resize-none border-none shadow-none text-base leading-relaxed p-0"
                        style={{ minHeight: '600px' }}
                      />
                    )}
                  </div>

                  {/* Job Assistant Sidebar */}
                  <div className="w-80 border-l bg-muted/30 p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Job Assistant</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Writing Suggestions</h4>
                        {isGenerating ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Zap className="h-4 w-4 animate-pulse" />
                            Analyzing your content...
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {aiSuggestions.map((suggestion, index) => (
                              <div key={index} className="p-3 bg-background rounded-lg border">
                                <p className="text-sm mb-2">{suggestion}</p>
                                <Button
                                  onClick={() => applySuggestion(suggestion)}
                                  size="sm"
                                  variant="outline"
                                  className="h-8"
                                >
                                  Apply
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <Separator />

                      <div>
                        <h4 className="text-sm font-medium mb-2">Quick Actions</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <Button variant="outline" size="sm" onClick={() => setContent(prev => prev + '\n\n## Summary\n\n')}>
                            Add Summary
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setContent(prev => prev + '\n\n## Conclusion\n\n')}>
                            Add Conclusion
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setContent(prev => prev + '\n\n---\n\n')}>
                            Add Divider
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setContent(prev => prev + '\n\n> **Note:** ')}>
                            Add Note
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No document selected</h3>
                  <p className="text-muted-foreground mb-4">Choose a document or create a new one</p>
                  <Button onClick={createNewDocument}>
                    <FileText className="h-4 w-4 mr-2" />
                    New Document
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}