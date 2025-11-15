import type { DeckAnalytics, AnalyticsExportFormat } from '@/lib/flashcards/analytics/types';

const csvEscape = (value: string | number) => {
  const str = String(value ?? '');
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const deckAnalyticsToCsv = (analytics: DeckAnalytics) => {
  const rows: Array<[string, string, string | number]> = [
    ['mastery', 'total_cards', analytics.mastery.total],
    ['mastery', 'mastered_cards', analytics.mastery.mastered],
    ['mastery', 'percentage', `${analytics.mastery.percentage}%`],
    ['workload', 'overdue', analytics.workload.overdue],
    ['workload', 'due_today', analytics.workload.dueToday],
    ['workload', 'due_next_7_days', analytics.workload.dueNext7Days],
    ['forgetting', 'average_risk', analytics.forgetting.averageRisk],
  ];

  analytics.workload.forecast.forEach(point => {
    rows.push(['forecast', point.date, point.count]);
  });

  analytics.retention.forEach(point => {
    rows.push([
      'retention',
      point.date,
      `${point.successRate.toFixed(1)}% (${point.correct}/${point.attempts})`,
    ]);
  });

  analytics.tagBreakdown.forEach(entry => {
    rows.push([
      `tag:${entry.tag}`,
      'stats',
      `total=${entry.total};mastered=${entry.mastered};due=${entry.due}`,
    ]);
  });

  analytics.forgetting.highRiskCards.forEach(entry => {
    rows.push([
      'high_risk',
      entry.cardId,
      `${entry.front} | risk=${entry.risk} | due=${entry.due}`,
    ]);
  });

  const header = ['section', 'label', 'value'];
  const csvBody = rows.map(row => row.map(csvEscape).join(',')).join('\n');
  return `${header.join(',')}\n${csvBody}`;
};

export const serializeDeckAnalytics = (analytics: DeckAnalytics, format: AnalyticsExportFormat) => {
  if (format === 'csv') {
    return deckAnalyticsToCsv(analytics);
  }
  return JSON.stringify(analytics, null, 2);
};
