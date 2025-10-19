'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLearningSession } from '@/lib/sessions/learning-session-context';
import { useSessionPage } from '@/lib/sessions/session-page-context';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ChevronLeft,
  ChevronRight,
  Clock, 
  Target,
  Play,
  Pause as PauseIcon,
  Check,
  X,
  Award,
  FileText,
  Loader2,
  AlertCircle
} from 'lucide-react';

// Import question components
import { MultipleChoice } from '@/components/questions/MultipleChoice/MultipleChoice';
import { TrueFalse } from '@/components/questions/TrueFalse/TrueFalse';
import { ShortAnswer } from '@/components/questions/ShortAnswer/ShortAnswer';
import { GapTextMultipleChoice } from '@/components/questions/GapTextMultipleChoice/GapTextMultipleChoice';
import { MultipleChoice3 } from '@/components/questions/MultipleChoice3/MultipleChoice3';
import { GapTextMatching } from '@/components/questions/GapTextMatching/GapTextMatching';
import { StatementMatching } from '@/components/questions/StatementMatching/StatementMatching';
import { QuestionTypeName } from '@/lib/sessions/questions/question-registry';
import type { QuestionResult } from '@/lib/sessions/questions/question-types';

export function SessionOrchestrator() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  
  const { sessionType, metadata } = useSessionPage();
  const { 
    sessionManager,
    activeSession,
    currentQuestion,
    questionProgress,
    isLoading,
    error,
    submitAnswer,
    nextQuestion,
    previousQuestion,
    pauseSession,
    resumeSession,
    endSession,
    completeQuestions,
    getSupportedQuestionTypes,
    getAllQuestions,
  } = useLearningSession();
  
  // Local state
  const [userAnswer, setUserAnswer] = useState<string | string[] | boolean | null>(null);
  const [questionResult, setQuestionResult] = useState<QuestionResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [timeOnQuestion, setTimeOnQuestion] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [finalResults, setFinalResults] = useState<any>(null);

  // Session timer
  useEffect(() => {
    if (activeSession?.status === 'active' && !sessionComplete) {
      const interval = setInterval(() => {
        setSessionTime(prev => prev + 1);
        setTimeOnQuestion(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeSession, sessionComplete]);

  // Reset state when question changes
  useEffect(() => {
    setUserAnswer(null);
    setQuestionResult(null);
    setTimeOnQuestion(0);
  }, [currentQuestion?.id]);

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || userAnswer === null) return;
    
    setIsSubmitting(true);
    try {
      const result = await submitAnswer(userAnswer, timeOnQuestion);
      setQuestionResult(result);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextQuestion = () => {
    if (!currentQuestion) return;
    
    const next = nextQuestion();
    if (!next && questionProgress.current === questionProgress.total) {
      handleCompleteSession();
    }
  };

  const handleCompleteSession = async () => {
    const results = await completeQuestions();
    if (results) {
      setFinalResults(results);
      setSessionComplete(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Loading state
  if (!activeSession || activeSession.id !== sessionId) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              {isLoading ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">Loading session...</p>
                </>
              ) : (
                <>
                  <AlertCircle className="h-8 w-8 text-muted-foreground" />
                  <p className="text-muted-foreground">Session not found</p>
                  <Button 
                    onClick={() => router.push(`/${sessionType}`)}
                    variant="outline"
                  >
                    Back to {metadata.displayName}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card className="border-red-200">
          <CardHeader className="bg-red-50">
            <CardTitle className="text-red-900">Session Error</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <p className="text-red-700">{error}</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/${sessionType}`)}
                >
                  Back to {metadata.displayName}
                </Button>
                <Button onClick={() => window.location.reload()}>
                  Retry
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Completion state
  if (sessionComplete && finalResults) {
    return (
      <div className="p-8 space-y-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <Award className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
            <CardTitle className="text-2xl">Session Complete!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-primary">
                {finalResults.totalScore} / {finalResults.maxScore}
              </p>
              <p className="text-xl text-muted-foreground mt-2">
                {Math.round(finalResults.percentage)}% Score
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Questions</p>
                <p className="text-2xl font-semibold">{questionProgress.total}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Time</p>
                <p className="text-2xl font-semibold">{formatTime(sessionTime)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Correct</p>
                <p className="text-2xl font-semibold">
                  {finalResults.results.filter((r: QuestionResult) => r.isCorrect).length}
                </p>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => router.push(`/${sessionType}`)}
            >
              Back to {metadata.displayName}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render question based on type
  const renderQuestion = () => {
    if (!currentQuestion) {
      return (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">No questions available</p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Questions generated: {getAllQuestions().length}</p>
                <p>Supported types: {getSupportedQuestionTypes().join(', ')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }
    
    const questionProps = {
      question: currentQuestion,
      onAnswer: setUserAnswer,
      onNext: handleNextQuestion,
      onPrevious: previousQuestion,
      isSubmitted: !!questionResult,
      isCorrect: questionResult?.isCorrect,
      feedback: questionResult?.feedback,
      questionNumber: questionProgress.current,
      totalQuestions: questionProgress.total,
    };
    
    const registryType = currentQuestion.registryType as QuestionTypeName;
    
    switch (registryType) {
      // Goethe C1 Reading Question Types
      case QuestionTypeName.GAP_TEXT_MULTIPLE_CHOICE:
        return <GapTextMultipleChoice {...questionProps} />;
        
      case QuestionTypeName.MULTIPLE_CHOICE_3:
        return <MultipleChoice3 {...questionProps} />;
        
      case QuestionTypeName.GAP_TEXT_MATCHING:
        return <GapTextMatching {...questionProps} />;
        
      case QuestionTypeName.STATEMENT_MATCHING:
        return <StatementMatching {...questionProps} />;
        
      // Legacy question types (kept for backward compatibility)
      case QuestionTypeName.MULTIPLE_CHOICE:
        return <MultipleChoice {...questionProps} />;
        
      case QuestionTypeName.TRUE_FALSE:
        return <TrueFalse {...questionProps} />;
        
      case QuestionTypeName.SHORT_ANSWER:
        return <ShortAnswer {...questionProps} />;
        
      default:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Question Type Not Implemented</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Question type "{registryType}" is not yet implemented.
              </p>
              <pre className="p-4 bg-muted rounded text-xs overflow-auto">
                {JSON.stringify(currentQuestion, null, 2)}
              </pre>
            </CardContent>
            <CardFooter>
              <Button onClick={handleNextQuestion}>
                Skip Question
              </Button>
            </CardFooter>
          </Card>
        );
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/${sessionType}`)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6" />
              {metadata.displayName} Session
            </h1>
            <p className="text-sm text-muted-foreground">Session ID: {sessionId}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {activeSession?.status === 'active' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={pauseSession}
            >
              <PauseIcon className="h-4 w-4 mr-2" />
              Pause
            </Button>
          ) : activeSession?.status === 'paused' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={resumeSession}
            >
              <Play className="h-4 w-4 mr-2" />
              Resume
            </Button>
          ) : null}
          
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              endSession('abandoned');
              router.push(`/${sessionType}`);
            }}
          >
            End Session
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Question {questionProgress.current} of {questionProgress.total}</span>
          <span>{Math.round(questionProgress.percentage)}% Complete</span>
        </div>
        <Progress value={questionProgress.percentage} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(sessionTime)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Answered</CardTitle>
            <Check className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {questionProgress.answered}/{questionProgress.total}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Points</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentQuestion?.points || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant={activeSession?.status === 'active' ? 'default' : 'secondary'}>
              {activeSession?.status}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Question Component */}
      {renderQuestion()}
      
      {/* Submit Button */}
      {currentQuestion && userAnswer !== null && !questionResult && (
        <div className="flex justify-center">
          <Button 
            onClick={handleSubmitAnswer} 
            disabled={isSubmitting}
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Answer'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}