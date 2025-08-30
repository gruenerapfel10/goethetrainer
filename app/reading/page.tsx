'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Clock, Target, Trophy, ArrowLeft, ArrowRight, CheckCircle, Calendar, Award, TrendingUp, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/context/firebase-auth-context';
import { sessionService } from '@/lib/firebase/session-service';
import { useRouter, useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';

const mockReadingData = {
  title: "Ein Tag in Berlin",
  text: `Berlin ist die Hauptstadt von Deutschland. Die Stadt hat etwa 3,7 Millionen Einwohner und ist sehr international. Jeden Tag kommen viele Touristen nach Berlin, um die Geschichte der Stadt zu entdecken.

Am Morgen besuchen die meisten Touristen das Brandenburger Tor. Es ist das berühmteste Wahrzeichen von Berlin. Danach gehen sie oft zum Reichstag, wo das deutsche Parlament arbeitet.

Am Nachmittag können die Besucher durch den Tiergarten spazieren. Das ist ein großer Park in der Mitte der Stadt. Dort gibt es viele Bäume und einen schönen See.

Am Abend essen die Touristen gerne in einem deutschen Restaurant. Die Berliner Küche ist sehr vielfältig. Man kann traditionelle deutsche Gerichte oder internationale Küche finden.`,
  questions: [
    {
      id: 1,
      question: "Wie viele Einwohner hat Berlin ungefähr?",
      options: ["2,5 Millionen", "3,7 Millionen", "4,2 Millionen", "5,1 Millionen"],
      correct: 1
    },
    {
      id: 2,
      question: "Was ist das berühmteste Wahrzeichen von Berlin?",
      options: ["Der Reichstag", "Der Tiergarten", "Das Brandenburger Tor", "Ein Restaurant"],
      correct: 2
    },
    {
      id: 3,
      question: "Wo arbeitet das deutsche Parlament?",
      options: ["Im Tiergarten", "Im Reichstag", "Am Brandenburger Tor", "In einem Restaurant"],
      correct: 1
    },
    {
      id: 4,
      question: "Was können Besucher am Nachmittag machen?",
      options: ["Durch den Tiergarten spazieren", "Das Brandenburger Tor besuchen", "Im Reichstag arbeiten", "Geschichte entdecken"],
      correct: 0
    },
    {
      id: 5,
      question: "Was gibt es im Tiergarten?",
      options: ["Restaurants und Touristen", "Das Parlament", "Viele Bäume und einen See", "Das Brandenburger Tor"],
      correct: 2
    },
    {
      id: 6,
      question: "Wie ist die Berliner Küche?",
      options: ["Nur traditionell deutsch", "Nur international", "Sehr teuer", "Sehr vielfältig"],
      correct: 3
    }
  ]
};

function PerformanceCard({ session, onResumeSession }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
      case 'in-progress':
        return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20';
      case 'abandoned':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'in-progress':
        return <Clock className="h-4 w-4" />;
      case 'abandoned':
        return <RotateCcw className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getScoreColor = (score, total) => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return 'text-green-600 dark:text-green-400';
    if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 border-border/50 bg-card/50 backdrop-blur-sm w-full">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          {/* Left: Title and Date */}
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-green-600" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {session.exerciseTitle}
              </h3>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(session.startedAt)}</span>
              </div>
            </div>
          </div>

          {/* Right: Status and Metrics */}
          <div className="flex items-center gap-6">
            {/* Performance Metrics */}
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Score</span>
                </div>
                <div className={`text-lg font-bold ${session.score !== undefined ? getScoreColor(session.score, session.totalQuestions) : 'text-muted-foreground'}`}>
                  {session.status === 'completed' 
                    ? `${session.score}/${session.totalQuestions}` 
                    : session.status === 'in-progress'
                    ? `${session.answers?.length || 0}/${session.totalQuestions}`
                    : '-/-'
                  }
                </div>
                {session.status === 'completed' && (
                  <div className="text-xs text-muted-foreground">
                    {Math.round((session.score / session.totalQuestions) * 100)}%
                  </div>
                )}
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Time</span>
                </div>
                <div className="text-lg font-semibold text-foreground">
                  {formatDuration(session.timeSpent || 0)}
                </div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Level</span>
                </div>
                <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                  {session.metadata?.level || 'B1'}
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
              {getStatusIcon(session.status)}
              <span className="capitalize">{session.status}</span>
            </div>

            {/* Action Button */}
            {session.status === 'in-progress' && (
              <Button 
                onClick={() => onResumeSession(session.id)}
                className="bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Resume
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar for In-Progress Sessions */}
        {session.status === 'in-progress' && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>{session.answers?.length || 0}/{session.totalQuestions}</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${((session.answers?.length || 0) / session.totalQuestions) * 100}%` 
                }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReadingExercise({ sessionId }: { sessionId: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [currentView, setCurrentView] = useState<'text' | 'answers'>('text');
  const [answers, setAnswers] = useState<string[]>(new Array(mockReadingData.questions.length).fill(''));
  const [showResults, setShowResults] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [sessionLoaded, setSessionLoaded] = useState(false);

  // Load existing session or validate session
  useEffect(() => {
    const loadSession = async () => {
      if (!user || !sessionId) return;
      
      try {
        const session = await sessionService.getSession(sessionId);
        if (!session) {
          console.error('Session not found:', sessionId);
          router.push('/reading');
          return;
        }
        
        // Verify session belongs to current user
        if (session.userId !== user.uid) {
          console.error('Session does not belong to current user');
          router.push('/reading');
          return;
        }
        
        // Load existing answers if session is in progress
        if (session.status === 'in-progress' && session.answers) {
          const existingAnswers = new Array(mockReadingData.questions.length).fill('');
          session.answers.forEach(answer => {
            const questionIndex = mockReadingData.questions.findIndex(q => q.id.toString() === answer.questionId);
            if (questionIndex !== -1) {
              existingAnswers[questionIndex] = answer.answer;
            }
          });
          setAnswers(existingAnswers);
        }
        
        // If session is already completed, show results
        if (session.status === 'completed') {
          setShowResults(true);
        }
        
        setSessionLoaded(true);
        console.log('Loaded session:', sessionId, session.status);
      } catch (error) {
        console.error('Failed to load session:', error);
        router.push('/reading');
      }
    };

    loadSession();
  }, [user, sessionId, router]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionId && !showResults && sessionLoaded) {
        const timeSpent = Math.floor((Date.now() - startTime) / 1000);
        sessionService.abandonSession(sessionId, timeSpent).catch(console.error);
      }
    };
  }, [sessionId, showResults, startTime, sessionLoaded]);

  const onBack = () => {
    router.push('/reading');
  };

  const handleAnswer = async (questionIndex: number, answer: string) => {
    const newAnswers = [...answers];
    newAnswers[questionIndex] = answer;
    setAnswers(newAnswers);

    // Update session with the answer
    if (sessionId) {
      try {
        await sessionService.updateAnswer(
          sessionId,
          mockReadingData.questions[questionIndex].id.toString(),
          answer
        );
      } catch (error) {
        console.error('Failed to update answer:', error);
      }
    }
  };

  const calculateScore = () => {
    let correct = 0;
    answers.forEach((answer, index) => {
      const correctLetter = ['a', 'b', 'c', 'd'][mockReadingData.questions[index].correct];
      if (answer.toLowerCase() === correctLetter) {
        correct++;
      }
    });
    return correct;
  };

  const submitAnswers = async () => {
    const score = calculateScore();
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    
    // Complete the session
    if (sessionId) {
      try {
        await sessionService.completeSession(sessionId, score, timeSpent);
        console.log('Session completed with score:', score);
      } catch (error) {
        console.error('Failed to complete session:', error);
      }
    }
    
    setShowResults(true);
  };

  // Show loading state while session is being loaded
  if (!sessionLoaded) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading session...</p>
        </div>
      </div>
    );
  }

  if (showResults) {
    const score = calculateScore();
    const percentage = Math.round((score / mockReadingData.questions.length) * 100);
    
    return (
      <div className="h-full relative">
        {/* Background blur effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blur-circle"></div>
          <div className="absolute top-40 -left-40 w-80 h-80 bg-blur-circle-light"></div>
          <div className="absolute bottom-20 right-20 w-72 h-72 bg-blur-circle-light"></div>
        </div>
        
        <div className="relative z-10 h-full flex flex-col p-8 pt-6">
          <div className="flex items-center gap-4 mb-6">
            <Button onClick={onBack} variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Overview
            </Button>
          </div>
          
          <div className="flex-1 flex items-center justify-center">
            <Card className="w-full max-w-2xl backdrop-blur-xl border-border/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <CardTitle>Exercise Complete!</CardTitle>
                </div>
                <CardDescription>
                  You scored {score} out of {mockReadingData.questions.length} ({percentage}%)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {mockReadingData.questions.map((question, index) => {
                    const userAnswer = answers[index];
                    const correctLetter = ['a', 'b', 'c', 'd'][question.correct];
                    const isCorrect = userAnswer.toLowerCase() === correctLetter;
                    
                    return (
                      <div key={question.id} className={`p-4 rounded-lg border ${
                        isCorrect 
                          ? 'border-green-500/30 bg-green-500/10 dark:border-green-400/30 dark:bg-green-400/10' 
                          : 'border-red-500/30 bg-red-500/10 dark:border-red-400/30 dark:bg-red-400/10'
                      }`}>
                        <p className="font-medium mb-2">{index + 1}. {question.question}</p>
                        <p className="text-sm text-muted-foreground">
                          Your answer: {userAnswer || 'No answer'} 
                          {userAnswer && ` (${question.options[['a', 'b', 'c', 'd'].indexOf(userAnswer.toLowerCase())]})`}
                        </p>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          Correct answer: {correctLetter} ({question.options[question.correct]})
                        </p>
                      </div>
                    );
                  })}
                </div>
                
                <div className="flex gap-2 pt-4 mt-4 border-t border-border/30">
                  <Button onClick={onBack} variant="outline" className="flex-1">
                    Back to Overview
                  </Button>
                  <Button onClick={() => window.location.reload()} className="flex-1">
                    Try Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Main exercise view with two-panel navigation
  return (
    <div className="h-full relative">
      <div className="relative z-10 h-full flex flex-col p-8 pt-6">
        {/* Top Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button onClick={onBack} variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Overview
          </Button>
        </div>
        
        {/* Two-Panel Navigation Buttons */}
        <div className="grid grid-cols-2 gap-0 mb-6">
          <Button
            variant={currentView === 'text' ? 'default' : 'outline'}
            className={`rounded-r-none border-r-0 ${
              currentView === 'text' 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'border-border hover:bg-accent'
            }`}
            onClick={() => setCurrentView('text')}
          >
            Lesetext (Source Text)
          </Button>
          <Button
            variant={currentView === 'answers' ? 'default' : 'outline'}
            className={`rounded-l-none ${
              currentView === 'answers' 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'border-border hover:bg-accent'
            }`}
            onClick={() => setCurrentView('answers')}
          >
            Antwortbogen (Answer Sheet)
          </Button>
        </div>
        
        <div className="flex-1 overflow-auto">
          {currentView === 'text' ? (
            /* Text View */
            <div className="max-w-4xl mx-auto">
              <div className="p-8">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-foreground">Lesen - Teil 2</h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    Lesen Sie den Text aus der Presse und die Aufgaben 6 bis 12 dazu.<br/>
                    Wählen Sie bei jeder Aufgabe die richtige Lösung [a], [b] oder [c].
                  </p>
                </div>

                {/* Article */}
                <div className="p-6 mb-6">
                  <h3 className="text-xl font-bold mb-4 text-center text-foreground">{mockReadingData.title}</h3>
                  <div className="text-justify leading-relaxed text-foreground whitespace-pre-line">
                    {mockReadingData.text}
                  </div>
                </div>

                <div className="text-center text-sm text-muted-foreground">
                  <p>Gehen Sie jetzt zum Antwortbogen und bearbeiten Sie die Aufgaben 6-12.</p>
                </div>
              </div>
            </div>
          ) : (
            /* Answer Sheet View */
            <div className="max-w-4xl mx-auto">
              <div className="p-8">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-foreground">Antwortbogen - Lesen Teil 2</h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    Markieren Sie die richtige Antwort [a], [b], [c] oder [d].
                  </p>
                </div>

                {/* Questions Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    {mockReadingData.questions.slice(0, 3).map((question, index) => (
                      <div key={question.id} className="p-4">
                        <p className="font-medium mb-3 text-sm text-foreground">{6 + index}. {question.question}</p>
                        <div className="space-y-2">
                          {['a', 'b', 'c', 'd'].map((letter, optIndex) => (
                            <label key={letter} className="flex items-center space-x-2 cursor-pointer">
                              <div className="relative">
                                <input
                                  type="radio"
                                  name={`question-${index}`}
                                  value={letter}
                                  checked={answers[index] === letter}
                                  onChange={(e) => handleAnswer(index, e.target.value)}
                                  className="sr-only"
                                />
                                <div className={`w-6 h-6 border-2 rounded flex items-center justify-center text-xs font-bold transition-colors ${
                                  answers[index] === letter 
                                    ? 'bg-green-600 text-white border-green-600' 
                                    : 'border-2 border-muted-foreground text-foreground hover:border-green-400'
                                }`}>
                                  {letter}
                                </div>
                              </div>
                              <span className="text-sm text-foreground">{question.options[optIndex]}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    {mockReadingData.questions.slice(3, 6).map((question, index) => (
                      <div key={question.id} className="p-4">
                        <p className="font-medium mb-3 text-sm text-foreground">{9 + index}. {question.question}</p>
                        <div className="space-y-2">
                          {['a', 'b', 'c', 'd'].map((letter, optIndex) => (
                            <label key={letter} className="flex items-center space-x-2 cursor-pointer">
                              <div className="relative">
                                <input
                                  type="radio"
                                  name={`question-${index + 3}`}
                                  value={letter}
                                  checked={answers[index + 3] === letter}
                                  onChange={(e) => handleAnswer(index + 3, e.target.value)}
                                  className="sr-only"
                                />
                                <div className={`w-6 h-6 border-2 rounded flex items-center justify-center text-xs font-bold transition-colors ${
                                  answers[index + 3] === letter 
                                    ? 'bg-green-600 text-white border-green-600' 
                                    : 'border-2 border-muted-foreground text-foreground hover:border-green-400'
                                }`}>
                                  {letter}
                                </div>
                              </div>
                              <span className="text-sm text-foreground">{question.options[optIndex]}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-center mt-8">
                  <Button onClick={submitAnswers} className="bg-green-600 hover:bg-green-700 text-white px-8 py-2">
                    Prüfung abgeben
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReadingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const [isStarting, setIsStarting] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const sessionsPerPage = 6;
  
  // Load user's reading sessions
  useEffect(() => {
    const loadSessions = async () => {
      if (!user) {
        setSessionsLoading(false);
        return;
      }

      try {
        const userSessions = await sessionService.getUserSessions(user.uid, 'reading');
        setSessions(userSessions);
      } catch (error) {
        console.error('Failed to load sessions:', error);
      } finally {
        setSessionsLoading(false);
      }
    };

    loadSessions();
  }, [user]);

  // Pagination logic
  const totalPages = Math.ceil(sessions.length / sessionsPerPage);
  const startIndex = (currentPage - 1) * sessionsPerPage;
  const currentSessions = sessions.slice(startIndex, startIndex + sessionsPerPage);

  // If there's a sessionId, show the exercise component
  if (sessionId) {
    return <ReadingExercise sessionId={sessionId} />;
  }

  const startNewSession = async () => {
    if (!user) {
      console.error('User must be authenticated to start session');
      alert('Please log in to start an exercise session');
      router.push('/login');
      return;
    }

    setIsStarting(true);
    try {
      console.log('Creating new session for user:', user.uid);
      const newSessionId = await sessionService.startSession(
        user,
        'reading',
        mockReadingData.title,
        mockReadingData.questions.length,
        { level: 'B1', difficulty: 'intermediate', tags: ['reading-comprehension'] }
      );
      
      console.log('Started new reading session:', newSessionId);
      router.push(`/reading?sessionId=${newSessionId}`);
    } catch (error) {
      console.error('Failed to start session:', error);
      alert('Failed to start session. Please try again.');
      setIsStarting(false);
    }
  };

  const handleResumeSession = (sessionId) => {
    router.push(`/reading?sessionId=${sessionId}`);
  };
  return (
    <div className="h-full">
      {/* Full Width Goethe Banner */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 dark:from-green-700 dark:to-green-800 text-white">
        <div className="p-6">
          <div className="grid grid-cols-2">
            <div>
              <h1 className="text-4xl font-bold mb-2">B1</h1>
              <p className="text-lg font-semibold">ZERTIFIKAT B1</p>
              <p className="text-sm">DEUTSCHPRÜFUNG FÜR</p>
              <p className="text-sm">JUGENDLICHE UND ERWACHSENE</p>
              <p className="text-xs mt-2 bg-green-500 px-2 py-1 rounded">MODELLSATZ ERWACHSENE</p>
            </div>
            <div className="text-right">
              <p className="text-sm">LESEN</p>
              <p className="text-xs">KANDIDATENBLÄTTER</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Background blur effects */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blur-circle"></div>
        <div className="absolute top-40 -left-40 w-80 h-80 bg-blur-circle-light"></div>
        <div className="absolute bottom-20 right-20 w-72 h-72 bg-blur-circle-light"></div>
        
        <div className="relative z-10 p-8 pb-24">
          {/* Session History Section */}
          {!loading && user && (
            <div className="space-y-6">
              {sessions.length > 0 && (
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-foreground">Session History</h3>
                  <div className="text-sm text-muted-foreground">
                    {sessions.length} session{sessions.length !== 1 ? 's' : ''} total
                  </div>
                </div>
              )}

              {/* Loading State */}
              {sessionsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse w-full">
                      <Card className="border-border/50 w-full">
                        <CardHeader className="space-y-2">
                          <div className="h-4 bg-muted rounded w-3/4"></div>
                          <div className="h-3 bg-muted rounded w-1/2"></div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-3 gap-4">
                            {[1, 2, 3].map((j) => (
                              <div key={j} className="text-center space-y-1">
                                <div className="h-3 bg-muted rounded w-full"></div>
                                <div className="h-6 bg-muted rounded w-full"></div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              ) : sessions.length === 0 ? (
                /* Empty State */
                <div className="text-center py-12">
                  <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h4 className="text-lg font-medium text-foreground mb-2">No sessions yet</h4>
                  <p className="text-muted-foreground mb-6">
                    Start your first reading exercise to begin tracking your progress!
                  </p>
                </div>
              ) : (
                /* Session Cards */
                <>
                  <div className="space-y-4">
                    {currentSessions.map((session) => (
                      <div key={session.id} className="w-full">
                        <PerformanceCard
                          session={session}
                          onResumeSession={handleResumeSession}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-6">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="border-border/50"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className={`w-10 h-10 ${
                              currentPage === page 
                                ? 'bg-green-600 hover:bg-green-700 text-white' 
                                : 'border-border/50'
                            }`}
                          >
                            {page}
                          </Button>
                        ))}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="border-border/50"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Login Prompt */}
          {!loading && !user && (
            <div className="text-center py-8">
              <h4 className="text-lg font-medium text-foreground mb-2">Track Your Progress</h4>
              <p className="text-muted-foreground mb-4">
                Log in to save your sessions and track your reading comprehension improvement over time.
              </p>
              <Button
                onClick={() => router.push('/login')}
                variant="outline"
                className="border-border/50"
              >
                Sign In
              </Button>
            </div>
          )}
        </div>

        {/* Floating Start Exercise Button */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
          <button
            onClick={startNewSession}
            disabled={isStarting || loading}
            className="inline-block text-white font-medium text-base rounded-3xl border border-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 shadow-lg hover:shadow-xl"
            style={{
              width: '180px',
              height: '40px',
              lineHeight: '40px',
              backgroundColor: '#000000'
            }}
          >
            {isStarting ? 'Starting...' : 'Start New Exercise'}
          </button>
        </div>
      </div>
    </div>
  );
}