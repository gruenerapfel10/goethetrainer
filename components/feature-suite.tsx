'use client';

import { useState } from 'react';
import { 
  DollarSign, 
  Heart, 
  Globe, 
  Home,
  TrendingUp,
  Activity,
  Languages,
  Smartphone,
  Bitcoin,
  Mic
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// 🚀 Crypto/Finance Tracker Component
export function CryptoFinanceTracker() {
  const [portfolio] = useState([
    { symbol: 'BTC', name: 'Bitcoin', amount: 0.5, price: 45000, change: 5.2 },
    { symbol: 'ETH', name: 'Ethereum', amount: 2.3, price: 3200, change: -2.1 },
    { symbol: 'ADA', name: 'Cardano', amount: 1000, price: 0.85, change: 8.7 },
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bitcoin className="h-5 w-5" />
          Crypto Portfolio
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {portfolio.map((asset) => (
            <div key={asset.symbol} className="flex items-center justify-between">
              <div>
                <div className="font-medium">{asset.symbol}</div>
                <div className="text-sm text-muted-foreground">{asset.amount} {asset.symbol}</div>
              </div>
              <div className="text-right">
                <div className="font-medium">${(asset.amount * asset.price).toLocaleString()}</div>
                <div className={cn(
                  "text-sm",
                  asset.change > 0 ? "text-green-600" : "text-red-600"
                )}>
                  {asset.change > 0 ? '+' : ''}{asset.change}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// 🌟 Habit Tracker Component
export function HabitTracker() {
  const [habits] = useState([
    { name: 'Morning Exercise', streak: 12, target: 30, completed: true },
    { name: 'Read 30 min', streak: 8, target: 21, completed: false },
    { name: 'Meditation', streak: 5, target: 14, completed: true },
    { name: 'Water Intake', streak: 20, target: 30, completed: true },
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Daily Habits
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {habits.map((habit) => (
            <div key={habit.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-medium">{habit.name}</div>
                <Badge variant={habit.completed ? "default" : "secondary"}>
                  {habit.streak} day streak
                </Badge>
              </div>
              <Progress value={(habit.streak / habit.target) * 100} className="h-2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// 🌍 Translation Component
export function TranslationSystem() {
  const [languages] = useState([
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
    { code: 'fr', name: 'French', flag: '🇫🇷' },
    { code: 'de', name: 'German', flag: '🇩🇪' },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
    { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Languages className="h-5 w-5" />
          Live Translation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          {languages.map((lang) => (
            <Button key={lang.code} variant="outline" size="sm" className="gap-2">
              <span>{lang.flag}</span>
              <span className="text-xs">{lang.name}</span>
            </Button>
          ))}
        </div>
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Mic className="h-4 w-4" />
            <span className="text-sm font-medium">Voice Translation Ready</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Speak in any language and get instant translations with voice synthesis
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// 🏠 Smart Home Integration
export function SmartHomeIntegration() {
  const [devices] = useState([
    { name: 'Living Room Lights', type: 'light', status: 'on', value: 75 },
    { name: 'Thermostat', type: 'climate', status: 'auto', value: 72 },
    { name: 'Security System', type: 'security', status: 'armed', value: 100 },
    { name: 'Smart Speaker', type: 'media', status: 'playing', value: 60 },
  ]);

  const getDeviceIcon = (type: string) => {
    const icons = {
      light: '💡',
      climate: '🌡️',
      security: '🔒',
      media: '🔊',
    };
    return icons[type as keyof typeof icons] || '📱';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Home className="h-5 w-5" />
          Smart Home
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {devices.map((device) => (
            <div key={device.name} className="p-3 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{getDeviceIcon(device.type)}</span>
                <div className="font-medium text-sm">{device.name}</div>
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-xs">
                  {device.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {device.value}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// 🌐 AR Chat Overlays (Simulated)
export function ARChatOverlays() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          AR Chat Overlays
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 border-2 border-dashed border-primary rounded-lg bg-primary/5">
            <div className="text-center">
              <Globe className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h4 className="font-medium">AR Mode Active</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Chat messages overlay on your camera view
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="bg-black/80 text-white p-2 rounded-lg text-sm max-w-xs">
              Hello! This message appears in AR space
            </div>
            <div className="bg-primary text-primary-foreground p-2 rounded-lg text-sm max-w-xs ml-auto">
              Amazing! I can see it floating in my view
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 🔧 Main Feature Suite Component
export function FeatureSuite() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <TrendingUp className="h-4 w-4" />
          Features
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Advanced Features Suite</DialogTitle>
          <DialogDescription>
            Explore the cutting-edge features that make Global Meridian your everything app
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="finance" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="finance">Finance</TabsTrigger>
            <TabsTrigger value="wellness">Wellness</TabsTrigger>
            <TabsTrigger value="translation">Translation</TabsTrigger>
            <TabsTrigger value="smart-home">Smart Home</TabsTrigger>
            <TabsTrigger value="ar">AR/Future</TabsTrigger>
          </TabsList>

          <TabsContent value="finance" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CryptoFinanceTracker />
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Market Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>S&P 500</span>
                      <span className="text-green-600">+1.2%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>NASDAQ</span>
                      <span className="text-green-600">+2.1%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Crypto Market Cap</span>
                      <span className="text-red-600">-0.5%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="wellness" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <HabitTracker />
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    Wellness Dashboard
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span>Daily Steps</span>
                        <span>8,542 / 10,000</span>
                      </div>
                      <Progress value={85} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span>Sleep Quality</span>
                        <span>7.5h</span>
                      </div>
                      <Progress value={94} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span>Mood Score</span>
                        <span>8.2/10</span>
                      </div>
                      <Progress value={82} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="translation" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TranslationSystem />
              <Card>
                <CardHeader>
                  <CardTitle>Real-time Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <h4 className="font-medium mb-1">Voice Translation</h4>
                      <p className="text-sm text-muted-foreground">
                        Speak in any language and get instant voice translations
                      </p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <h4 className="font-medium mb-1">Live Chat Translation</h4>
                      <p className="text-sm text-muted-foreground">
                        Automatic translation of chat messages in real-time
                      </p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <h4 className="font-medium mb-1">Cultural Context</h4>
                      <p className="text-sm text-muted-foreground">
                        AI-powered cultural context and etiquette suggestions
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="smart-home" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SmartHomeIntegration />
              <Card>
                <CardHeader>
                  <CardTitle>Automation Rules</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 border rounded-lg">
                      <div className="font-medium text-sm">Morning Routine</div>
                      <div className="text-xs text-muted-foreground">
                        Turn on lights, adjust temperature, start coffee
                      </div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="font-medium text-sm">Away Mode</div>
                      <div className="text-xs text-muted-foreground">
                        Arm security, turn off lights, adjust thermostat
                      </div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="font-medium text-sm">Night Mode</div>
                      <div className="text-xs text-muted-foreground">
                        Dim lights, lock doors, activate sleep sounds
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ar" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ARChatOverlays />
              <Card>
                <CardHeader>
                  <CardTitle>Future Technologies</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border">
                      <h4 className="font-medium mb-1">Neural Interface</h4>
                      <p className="text-sm text-muted-foreground">
                        Direct thought-to-text communication (Coming 2025)
                      </p>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg border">
                      <h4 className="font-medium mb-1">Holographic Calls</h4>
                      <p className="text-sm text-muted-foreground">
                        3D holographic video conferencing
                      </p>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border">
                      <h4 className="font-medium mb-1">Quantum Sync</h4>
                      <p className="text-sm text-muted-foreground">
                        Instant synchronization across dimensions
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}