'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Play, 
  Pause, 
  Trash2, 
  Edit, 
  Copy, 
  Settings, 
  Zap,
  Clock,
  MessageSquare,
  Webhook,
  Bell,
  Globe,
  Bot,
  Timer,
  GitBranch
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WorkflowEngine } from '@/lib/automation/workflow-engine';
import type { Workflow, WorkflowTrigger, WorkflowAction, WorkflowExecution } from '@/lib/automation/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export function WorkflowBuilder() {
  const [isOpen, setIsOpen] = useState(false);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [stats, setStats] = useState<any>(null);
  
  const workflowEngine = WorkflowEngine.getInstance();

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = () => {
    setWorkflows(workflowEngine.getWorkflows());
    setExecutions(workflowEngine.getExecutions());
    setStats(workflowEngine.getStats());
  };

  const handleToggleWorkflow = (workflowId: string, enabled: boolean) => {
    workflowEngine.updateWorkflow(workflowId, { enabled });
    loadData();
  };

  const handleDeleteWorkflow = (workflowId: string) => {
    workflowEngine.deleteWorkflow(workflowId);
    loadData();
  };

  const handleTriggerWorkflow = (workflowId: string) => {
    workflowEngine.triggerWorkflow(workflowId);
    loadData();
  };

  const getTriggerIcon = (type: string) => {
    const icons = {
      schedule: Clock,
      event: Zap,
      webhook: Webhook,
      message: MessageSquare,
      connector: Globe,
      manual: Play,
    };
    return icons[type as keyof typeof icons] || Zap;
  };

  const getActionIcon = (type: string) => {
    const icons = {
      connector: Globe,
      notification: Bell,
      webhook: Webhook,
      ai: Bot,
      delay: Timer,
      condition: GitBranch,
    };
    return icons[type as keyof typeof icons] || Zap;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      running: 'bg-blue-500',
      completed: 'bg-green-500',
      failed: 'bg-red-500',
      cancelled: 'bg-gray-500',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-500';
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Zap className="h-4 w-4" />
          Workflows
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Workflow Automation
          </DialogTitle>
          <DialogDescription>
            Create and manage automated workflows to streamline your tasks
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="workflows" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="workflows">Workflows</TabsTrigger>
            <TabsTrigger value="executions">Executions</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="workflows" className="mt-4 overflow-y-auto max-h-[60vh]">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Your Workflows</h3>
                <Button onClick={() => setIsCreating(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Workflow
                </Button>
              </div>

              {/* Workflows Grid */}
              {workflows.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Zap className="h-12 w-12 text-muted-foreground mb-4" />
                    <h4 className="text-lg font-semibold mb-2">No workflows yet</h4>
                    <p className="text-muted-foreground text-center mb-4">
                      Create your first workflow to automate repetitive tasks
                    </p>
                    <Button onClick={() => setIsCreating(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Workflow
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <AnimatePresence>
                    {workflows.map((workflow) => (
                      <motion.div
                        key={workflow.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Card className={cn(
                          'group cursor-pointer transition-all duration-200',
                          workflow.enabled ? 'border-primary/20 bg-primary/5' : 'border-border'
                        )}>
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-sm font-medium">{workflow.name}</CardTitle>
                                <CardDescription className="text-xs mt-1">
                                  {workflow.description}
                                </CardDescription>
                              </div>
                              <Switch
                                checked={workflow.enabled}
                                onCheckedChange={(enabled) => handleToggleWorkflow(workflow.id, enabled)}
                                size="sm"
                              />
                            </div>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {workflow.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </CardHeader>

                          <CardContent className="pt-0">
                            {/* Triggers and Actions Summary */}
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                              <div className="flex items-center gap-1">
                                <span>{workflow.triggers.length} trigger{workflow.triggers.length !== 1 ? 's' : ''}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span>{workflow.actions.length} action{workflow.actions.length !== 1 ? 's' : ''}</span>
                              </div>
                            </div>

                            {/* Stats */}
                            <div className="flex items-center justify-between text-xs mb-3">
                              <span className="text-muted-foreground">
                                Runs: {workflow.runCount}
                              </span>
                              {workflow.lastRun && (
                                <span className="text-muted-foreground">
                                  {formatDistanceToNow(workflow.lastRun, { addSuffix: true })}
                                </span>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleTriggerWorkflow(workflow.id)}
                                disabled={!workflow.enabled}
                              >
                                <Play className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setSelectedWorkflow(workflow)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive"
                                onClick={() => handleDeleteWorkflow(workflow.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="executions" className="mt-4 overflow-y-auto max-h-[60vh]">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Recent Executions</h3>
              
              {executions.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                    <h4 className="text-lg font-semibold mb-2">No executions yet</h4>
                    <p className="text-muted-foreground text-center">
                      Workflow executions will appear here when they run
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {executions.slice(0, 20).map((execution) => {
                    const workflow = workflows.find(w => w.id === execution.workflowId);
                    return (
                      <Card key={execution.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'w-2 h-2 rounded-full',
                              getStatusColor(execution.status)
                            )} />
                            <div>
                              <p className="font-medium text-sm">{workflow?.name || 'Unknown Workflow'}</p>
                              <p className="text-xs text-muted-foreground">
                                Started {formatDistanceToNow(execution.startTime, { addSuffix: true })}
                                {execution.endTime && (
                                  <span className="ml-2">
                                    • Duration: {execution.endTime.getTime() - execution.startTime.getTime()}ms
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={execution.status === 'completed' ? 'default' : 
                                           execution.status === 'failed' ? 'destructive' : 'secondary'}>
                              {execution.status}
                            </Badge>
                            {execution.logs.length > 0 && (
                              <Button variant="ghost" size="sm">
                                View Logs ({execution.logs.length})
                              </Button>
                            )}
                          </div>
                        </div>
                        {execution.error && (
                          <div className="mt-2 p-2 bg-destructive/10 rounded-md">
                            <p className="text-xs text-destructive">{execution.error}</p>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="templates" className="mt-4 overflow-y-auto max-h-[60vh]">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Workflow Templates</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    name: 'Daily Email Summary',
                    description: 'Get a daily summary of unread emails',
                    category: 'Email',
                    triggers: ['Schedule'],
                    actions: ['Gmail', 'Notification'],
                  },
                  {
                    name: 'Important Message Alert',
                    description: 'Alert when urgent messages are detected',
                    category: 'Messaging',
                    triggers: ['Message Pattern'],
                    actions: ['Notification', 'AI Analysis'],
                  },
                  {
                    name: 'Task Reminder',
                    description: 'Remind about upcoming tasks and deadlines',
                    category: 'Productivity',
                    triggers: ['Schedule'],
                    actions: ['Calendar', 'Notification'],
                  },
                  {
                    name: 'System Health Check',
                    description: 'Monitor system status and alert on issues',
                    category: 'Monitoring',
                    triggers: ['Webhook'],
                    actions: ['Condition', 'Notification'],
                  },
                ].map((template) => (
                  <Card key={template.name} className="cursor-pointer hover:bg-muted/50">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-sm">{template.name}</CardTitle>
                          <CardDescription className="text-xs mt-1">
                            {template.description}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {template.category}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Triggers:</span>
                          {template.triggers.map((trigger) => (
                            <Badge key={trigger} variant="secondary" className="text-xs">
                              {trigger}
                            </Badge>
                          ))}
                        </div>
                        <Button size="sm" variant="outline">
                          Use Template
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="stats" className="mt-4 overflow-y-auto max-h-[60vh]">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Statistics</h3>
              
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">{stats.totalWorkflows}</div>
                      <p className="text-xs text-muted-foreground">Total Workflows</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">{stats.activeWorkflows}</div>
                      <p className="text-xs text-muted-foreground">Active Workflows</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">{stats.totalExecutions}</div>
                      <p className="text-xs text-muted-foreground">Total Executions</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">
                        {stats.totalExecutions > 0 
                          ? Math.round((stats.successfulExecutions / stats.totalExecutions) * 100)
                          : 0}%
                      </div>
                      <p className="text-xs text-muted-foreground">Success Rate</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}