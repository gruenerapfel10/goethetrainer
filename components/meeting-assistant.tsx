'use client';

import { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff, Users, FileText, BarChart2, Clock, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { TranscriptionService } from '@/lib/meeting/transcription-service';
import type { 
  Meeting, 
  TranscriptSegment, 
  Participant,
  MeetingSummary,
  MeetingAnalytics,
  TranscriptionConfig 
} from '@/lib/meeting/types';
import { generateUUID } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface MeetingAssistantProps {
  userId: string;
  userName?: string;
}

export function MeetingAssistant({ userId, userName = 'User' }: MeetingAssistantProps) {
  const [currentMeeting, setCurrentMeeting] = useState<Meeting | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
  const [summary, setSummary] = useState<MeetingSummary | null>(null);
  const [analytics, setAnalytics] = useState<MeetingAnalytics | null>(null);
  const [activeTab, setActiveTab] = useState<'transcript' | 'summary' | 'analytics' | 'actions'>('transcript');
  
  const transcriptionService = TranscriptionService.getInstance();

  const startMeeting = useCallback(() => {
    const meeting: Meeting = {
      id: generateUUID(),
      title: `Meeting ${new Date().toLocaleString()}`,
      startTime: new Date(),
      participants: [
        {
          id: userId,
          name: userName,
          joinedAt: new Date(),
        },
      ],
      transcript: [],
      actionItems: [],
      decisions: [],
      status: 'active',
      created: new Date(),
      updated: new Date(),
    };
    
    setCurrentMeeting(meeting);
    setTranscriptSegments([]);
    setSummary(null);
    setAnalytics(null);
    
    const config: TranscriptionConfig = {
      language: 'en-US',
      enablePunctuation: true,
      enableSpeakerDiarization: true,
      enableRealtime: true,
      interim: true,
    };
    
    try {
      transcriptionService.startTranscription(meeting, config);
      setIsRecording(true);
      toast.success('Meeting started and recording!');
    } catch (error) {
      toast.error('Failed to start transcription. Please check microphone permissions.');
    }
  }, [userId, userName]);

  const stopMeeting = useCallback(async () => {
    if (!currentMeeting) return;
    
    transcriptionService.stopTranscription();
    setIsRecording(false);
    
    // Update meeting end time
    currentMeeting.endTime = new Date();
    currentMeeting.status = 'completed';
    
    // Generate summary
    try {
      const meetingSummary = await transcriptionService.generateSummary(currentMeeting);
      setSummary(meetingSummary);
      
      // Calculate analytics
      const meetingAnalytics = transcriptionService.calculateAnalytics(currentMeeting);
      setAnalytics(meetingAnalytics);
      
      toast.success('Meeting ended and summary generated!');
    } catch (error) {
      toast.error('Failed to generate meeting summary');
    }
  }, [currentMeeting]);

  // Update transcript in real-time
  useEffect(() => {
    if (!isRecording || !currentMeeting) return;
    
    const interval = setInterval(() => {
      const status = transcriptionService.getTranscriptionStatus();
      if (status.currentMeeting) {
        setTranscriptSegments([...status.currentMeeting.transcript]);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isRecording, currentMeeting]);

  const exportMeeting = () => {
    if (!currentMeeting) return;
    
    const exportData = {
      meeting: currentMeeting,
      summary,
      analytics,
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-${currentMeeting.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Meeting exported successfully!');
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getSentimentColor = (sentiment?: 'positive' | 'neutral' | 'negative') => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-600';
      case 'negative':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getSentimentEmoji = (sentiment?: 'positive' | 'neutral' | 'negative') => {
    switch (sentiment) {
      case 'positive':
        return '😊';
      case 'negative':
        return '😟';
      default:
        return '😐';
    }
  };

  return (
    <div className="w-full space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                AI Meeting Assistant
              </CardTitle>
              <CardDescription>
                Real-time transcription, summaries, and action items
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {currentMeeting && currentMeeting.status === 'completed' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportMeeting}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              )}
              <Button
                variant={isRecording ? 'destructive' : 'default'}
                onClick={isRecording ? stopMeeting : startMeeting}
              >
                {isRecording ? (
                  <>
                    <MicOff className="h-4 w-4 mr-2" />
                    Stop Meeting
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-2" />
                    Start Meeting
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {currentMeeting && (
            <div className="space-y-4">
              {/* Meeting Info */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <Badge variant={isRecording ? 'default' : 'secondary'}>
                    {currentMeeting.status}
                  </Badge>
                  <span className="text-muted-foreground">
                    Started: {currentMeeting.startTime.toLocaleTimeString()}
                  </span>
                  {currentMeeting.endTime && (
                    <span className="text-muted-foreground">
                      Duration: {formatDuration(
                        Math.floor((currentMeeting.endTime.getTime() - currentMeeting.startTime.getTime()) / 1000)
                      )}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {currentMeeting.participants.length} participants
                  </span>
                </div>
              </div>

              <Separator />

              {/* Content Tabs */}
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="transcript">
                    Transcript ({transcriptSegments.length})
                  </TabsTrigger>
                  <TabsTrigger value="summary" disabled={!summary}>
                    Summary
                  </TabsTrigger>
                  <TabsTrigger value="analytics" disabled={!analytics}>
                    Analytics
                  </TabsTrigger>
                  <TabsTrigger value="actions">
                    Actions ({currentMeeting.actionItems.length})
                  </TabsTrigger>
                </TabsList>

                {/* Transcript Tab */}
                <TabsContent value="transcript" className="space-y-4">
                  <ScrollArea className="h-[400px] pr-4">
                    {transcriptSegments.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        {isRecording ? (
                          <>
                            <Mic className="h-12 w-12 mx-auto mb-4 animate-pulse" />
                            <p>Listening... Start speaking to see transcript</p>
                          </>
                        ) : (
                          <p>No transcript available</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {transcriptSegments.map((segment) => (
                          <div key={segment.id} className="flex gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {segment.speaker.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{segment.speaker}</span>
                                <span className="text-xs text-muted-foreground">
                                  {segment.timestamp.toLocaleTimeString()}
                                </span>
                                <span className={`text-xs ${getSentimentColor(segment.sentiment)}`}>
                                  {getSentimentEmoji(segment.sentiment)}
                                </span>
                              </div>
                              <p className="text-sm">{segment.text}</p>
                              {segment.keywords && segment.keywords.length > 0 && (
                                <div className="flex gap-1 mt-1">
                                  {segment.keywords.map((keyword, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {keyword}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                {/* Summary Tab */}
                <TabsContent value="summary" className="space-y-4">
                  {summary && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Overview</h4>
                        <p className="text-sm text-muted-foreground">{summary.overview}</p>
                      </div>

                      {summary.keyPoints.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Key Points</h4>
                          <ul className="space-y-1">
                            {summary.keyPoints.map((point, idx) => (
                              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="text-primary">•</span>
                                {point}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div>
                        <h4 className="text-sm font-medium mb-2">Meeting Sentiment</h4>
                        <div className="flex items-center gap-4">
                          <Badge variant={
                            summary.sentiment.overall === 'positive' ? 'default' :
                            summary.sentiment.overall === 'negative' ? 'destructive' :
                            'secondary'
                          }>
                            {summary.sentiment.overall}
                          </Badge>
                          <div className="flex-1 flex gap-2">
                            <div className="flex-1">
                              <div className="flex justify-between text-xs mb-1">
                                <span>Positive</span>
                                <span>{summary.sentiment.distribution.positive.toFixed(0)}%</span>
                              </div>
                              <Progress value={summary.sentiment.distribution.positive} className="h-2" />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between text-xs mb-1">
                                <span>Neutral</span>
                                <span>{summary.sentiment.distribution.neutral.toFixed(0)}%</span>
                              </div>
                              <Progress value={summary.sentiment.distribution.neutral} className="h-2" />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between text-xs mb-1">
                                <span>Negative</span>
                                <span>{summary.sentiment.distribution.negative.toFixed(0)}%</span>
                              </div>
                              <Progress value={summary.sentiment.distribution.negative} className="h-2" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {summary.topics.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Topics Discussed</h4>
                          <div className="flex flex-wrap gap-2">
                            {summary.topics.map((topic, idx) => (
                              <Badge key={idx} variant="outline">
                                {topic.name}
                                <span className="ml-1 text-xs opacity-60">
                                  ({formatDuration(topic.duration)})
                                </span>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                {/* Analytics Tab */}
                <TabsContent value="analytics" className="space-y-4">
                  {analytics && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Total Duration</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-2xl font-bold">
                              {formatDuration(Math.floor(analytics.totalDuration))}
                            </p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Questions Asked</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-2xl font-bold">{analytics.questionCount}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Participation Rate</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-2xl font-bold">
                              {(analytics.participationRate * 100).toFixed(0)}%
                            </p>
                          </CardContent>
                        </Card>
                      </div>

                      {analytics.speakingTimeDistribution.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Speaking Time Distribution</h4>
                          <div className="space-y-2">
                            {analytics.speakingTimeDistribution.map((participant) => (
                              <div key={participant.participantId} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span>{participant.name}</span>
                                  <span className="text-muted-foreground">
                                    {formatDuration(participant.duration)} ({participant.percentage.toFixed(0)}%)
                                  </span>
                                </div>
                                <Progress value={participant.percentage} className="h-2" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                {/* Actions Tab */}
                <TabsContent value="actions" className="space-y-4">
                  <div className="space-y-4">
                    {/* Action Items */}
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Action Items ({currentMeeting.actionItems.length})
                      </h4>
                      {currentMeeting.actionItems.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No action items identified</p>
                      ) : (
                        <div className="space-y-2">
                          {currentMeeting.actionItems.map((item) => (
                            <Card key={item.id}>
                              <CardContent className="p-3">
                                <div className="flex items-start justify-between">
                                  <div className="space-y-1">
                                    <p className="text-sm font-medium">{item.title}</p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <span>Assigned to: {item.assignee}</span>
                                      <Badge variant="outline" className="text-xs">
                                        {item.priority}
                                      </Badge>
                                    </div>
                                  </div>
                                  <Badge variant={
                                    item.status === 'completed' ? 'default' :
                                    item.status === 'in_progress' ? 'secondary' :
                                    'outline'
                                  }>
                                    {item.status}
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Decisions */}
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Decisions ({currentMeeting.decisions.length})
                      </h4>
                      {currentMeeting.decisions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No decisions recorded</p>
                      ) : (
                        <div className="space-y-2">
                          {currentMeeting.decisions.map((decision) => (
                            <Card key={decision.id}>
                              <CardContent className="p-3">
                                <div className="space-y-1">
                                  <p className="text-sm font-medium">{decision.title}</p>
                                  <p className="text-xs text-muted-foreground">{decision.description}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>By: {decision.madeBy}</span>
                                    <span>•</span>
                                    <span>{decision.timestamp.toLocaleTimeString()}</span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {!currentMeeting && (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Start a meeting to begin transcription</p>
              <p className="text-sm mt-2">AI will automatically generate summaries and extract action items</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}