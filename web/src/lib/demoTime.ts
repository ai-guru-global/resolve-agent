export const DEMO_NOW = '2026-08-31T10:30:00Z';

export function formatTimeAgo(isoString: string, now: string = DEMO_NOW): string {
  const diffMs = new Date(now).getTime() - new Date(isoString).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}
