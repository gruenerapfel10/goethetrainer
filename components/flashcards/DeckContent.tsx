import { Card, CardContent } from '@/components/ui/card';
import type { DeckAnalytics } from '@/lib/flashcards/analytics/types';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from 'recharts';

type DeckContentProps = {
  deck?: DeckAnalytics | null;
};

const freshnessColor = (lastUpdated: string | undefined) => {
  if (!lastUpdated) return '#60a5fa'; // fallback blue
  const now = Date.now();
  const updated = new Date(lastUpdated).getTime();
  const elapsedSec = Math.max(0, (now - updated) / 1000);
  const sevenDays = 7 * 24 * 60 * 60;
  const t = Math.min(1, elapsedSec / sevenDays);
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * t);
  const start = { r: 96, g: 165, b: 250 }; // blue-400
  const end = { r: 239, g: 68, b: 68 }; // red-500
  const r = lerp(start.r, end.r);
  const g = lerp(start.g, end.g);
  const b = lerp(start.b, end.b);
  return `rgb(${r}, ${g}, ${b})`;
};

export function DeckContent({ deck }: DeckContentProps) {
  if (!deck) return null;
  const stroke = freshnessColor(deck.lastUpdated);
  const points = deck.retention.slice(-10).map(point => ({
    date: point.date,
    success: point.successRate ?? 0,
  }));
  const sessions = deck.sessionCount ?? 0;

  const config = {
    success: { label: 'Success %', color: stroke },
  } satisfies ChartConfig;

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardContent className="p-0">
        <ChartContainer config={config} className="min-h-[100px] h-[100px] w-full !aspect-auto">
          <LineChart accessibilityLayer data={points} margin={{ left: 6, right: 6, top: 2, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickFormatter={value => String(value).slice(5, 10)}
              tickMargin={4}
              minTickGap={16}
            />
            <YAxis hide domain={[0, 100]} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey="success" stroke="var(--color-success)" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartContainer>
        <div className="flex items-center justify-between px-1 pt-1 text-[11px] text-muted-foreground">
          <span>Sessions</span>
          <span className="font-semibold text-foreground">{sessions}</span>
        </div>
      </CardContent>
    </Card>
  );
}
