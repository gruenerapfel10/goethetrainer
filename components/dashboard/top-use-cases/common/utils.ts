/**
 * Format a date string into a full, readable format.
 */
export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
};

/**
 * Format a date string into a more compact, readable format.
 * Shows time for today, days for within a week, and full date for older dates.
 */
export const formatCompactDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.round((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 1) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 365) return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

/**
 * Format minutes into a human-readable duration string (days, hours, minutes).
 */
export const formatTotalTimeSaved = (minutes: number): string => {
  if (Number.isNaN(minutes) || minutes <= 0) return "0m";

  const oneDayInMinutes = 24 * 60;
  const oneHourInMinutes = 60;

  if (minutes >= oneDayInMinutes) {
    const days = Math.floor(minutes / oneDayInMinutes);
    const remainingHours = Math.round((minutes % oneDayInMinutes) / oneHourInMinutes);
    return `${days}d${remainingHours > 0 ? ` ${remainingHours}h` : ''}`;
  }
  if (minutes >= oneHourInMinutes) {
    return `${Math.round(minutes / oneHourInMinutes)}h`;
  }
  return `${Math.round(minutes)}m`;
};

/**
 * Check if text contains the given search query.
 */
export const containsMatch = (text: string | null, query: string) => {
  if (!query || !text) return false;
  return text.toLowerCase().includes(query.toLowerCase());
};
