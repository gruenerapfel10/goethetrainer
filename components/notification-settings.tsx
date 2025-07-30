'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
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
import { Badge } from '@/components/ui/badge';
import { Settings, Plus, Trash2, TestTube } from 'lucide-react';
import { NotificationService } from '@/lib/notifications/notification-service';
import type { NotificationPreferences, NotificationRule } from '@/lib/notifications/types';
import { cn } from '@/lib/utils';

export function NotificationSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [hasPermission, setHasPermission] = useState(false);
  
  const notificationService = NotificationService.getInstance();

  useEffect(() => {
    if (isOpen) {
      // Load current preferences and rules
      setPreferences(notificationService.getPreferences());
      setRules(notificationService.getRules());
      
      // Check notification permission
      setHasPermission(Notification.permission === 'granted');
    }
  }, [isOpen]);

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: any) => {
    if (!preferences) return;
    
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    notificationService.updatePreferences({ [key]: value });
  };

  const handleFilterChange = (category: 'types' | 'priorities', key: string, value: boolean) => {
    if (!preferences) return;
    
    const updated = {
      ...preferences,
      filters: {
        ...preferences.filters,
        [category]: {
          ...preferences.filters[category],
          [key]: value,
        },
      },
    };
    setPreferences(updated);
    notificationService.updatePreferences(updated);
  };

  const requestPermission = async () => {
    const granted = await notificationService.requestPermission();
    setHasPermission(granted);
  };

  const testNotification = async () => {
    await notificationService.notify({
      type: 'info',
      title: 'Test Notification',
      message: 'This is a test notification to check your settings!',
      priority: 'medium',
      source: { type: 'system' },
    });
  };

  const createRule = () => {
    const ruleId = notificationService.addRule({
      name: 'New Rule',
      description: 'Custom notification rule',
      enabled: true,
      conditions: [
        {
          field: 'message',
          operator: 'contains',
          value: 'urgent',
        },
      ],
      actions: [
        {
          type: 'notify',
          config: { priority: 'high' },
        },
      ],
    });
    
    setRules(notificationService.getRules());
  };

  const deleteRule = (ruleId: string) => {
    notificationService.deleteRule(ruleId);
    setRules(notificationService.getRules());
  };

  const toggleRule = (ruleId: string, enabled: boolean) => {
    notificationService.updateRule(ruleId, { enabled });
    setRules(notificationService.getRules());
  };

  if (!preferences) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Notification Settings</DialogTitle>
          <DialogDescription>
            Configure how and when you receive notifications
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Permission Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Browser Notifications</h4>
              <p className="text-sm text-muted-foreground">
                {hasPermission 
                  ? 'You will receive desktop notifications'
                  : 'Desktop notifications are disabled'
                }
              </p>
            </div>
            {!hasPermission && (
              <Button onClick={requestPermission} size="sm">
                Enable
              </Button>
            )}
          </div>

          {/* General Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">General</h3>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="enabled" className="flex flex-col gap-1">
                <span>Enable Notifications</span>
                <span className="font-normal text-sm text-muted-foreground">
                  Master switch for all notifications
                </span>
              </Label>
              <Switch
                id="enabled"
                checked={preferences.enabled}
                onCheckedChange={(checked) => handlePreferenceChange('enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="sound" className="flex flex-col gap-1">
                <span>Sound</span>
                <span className="font-normal text-sm text-muted-foreground">
                  Play sound for notifications
                </span>
              </Label>
              <Switch
                id="sound"
                checked={preferences.sound}
                onCheckedChange={(checked) => handlePreferenceChange('sound', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="desktop" className="flex flex-col gap-1">
                <span>Desktop Notifications</span>
                <span className="font-normal text-sm text-muted-foreground">
                  Show system notifications
                </span>
              </Label>
              <Switch
                id="desktop"
                checked={preferences.desktop}
                onCheckedChange={(checked) => handlePreferenceChange('desktop', checked)}
              />
            </div>
          </div>

          {/* Notification Types */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Notification Types</h3>
            
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(preferences.filters.types).map(([type, enabled]) => (
                <div key={type} className="flex items-center justify-between">
                  <Label htmlFor={`type-${type}`} className="capitalize">
                    {type}
                  </Label>
                  <Switch
                    id={`type-${type}`}
                    checked={enabled}
                    onCheckedChange={(checked) => handleFilterChange('types', type, checked)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Priority Levels */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Priority Levels</h3>
            
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(preferences.filters.priorities).map(([priority, enabled]) => (
                <div key={priority} className="flex items-center justify-between">
                  <Label htmlFor={`priority-${priority}`} className="capitalize">
                    {priority}
                  </Label>
                  <Switch
                    id={`priority-${priority}`}
                    checked={enabled}
                    onCheckedChange={(checked) => handleFilterChange('priorities', priority, checked)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Custom Rules */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Custom Rules</h3>
              <Button onClick={createRule} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Rule
              </Button>
            </div>
            
            {rules.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No custom rules configured
              </p>
            ) : (
              <div className="space-y-2">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{rule.name}</span>
                        <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                          {rule.enabled ? 'Active' : 'Disabled'}
                        </Badge>
                      </div>
                      {rule.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {rule.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={(checked) => toggleRule(rule.id, checked)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteRule(rule.id)}
                        className="h-8 w-8 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Test Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Test</h3>
            <Button onClick={testNotification} variant="outline" className="w-full">
              <TestTube className="h-4 w-4 mr-2" />
              Send Test Notification
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => setIsOpen(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}