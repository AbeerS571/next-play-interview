// How many days ahead counts as "due soon"
export const DUE_SOON_DAYS = 3;

// new Date('YYYY-MM-DD') parses as UTC and can land on the previous day, so build a local date
export function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatDueDate(key, withYear = false) {
  if (!key) return null;
  return parseDateKey(key).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' } : {}),
  });
}

function daysUntil(key) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((parseDateKey(key) - today) / 86400000);
}

// Returns { level: 'overdue' | 'today' | 'soon', label } or null
export function getUrgency(task) {
  if (!task.due_date || task.status === 'done') return null;
  const days = daysUntil(task.due_date);
  if (days < 0) {
    return { level: 'overdue', label: days === -1 ? 'Overdue by 1 day' : `Overdue by ${-days} days` };
  }
  if (days === 0) return { level: 'today', label: 'Due today' };
  if (days <= DUE_SOON_DAYS) {
    return { level: 'soon', label: days === 1 ? 'Due tomorrow' : `Due in ${days} days` };
  }
  return null;
}

export function timeAgo(timestamp) {
  const seconds = Math.round((new Date(timestamp) - Date.now()) / 1000);
  if (Math.abs(seconds) < 45) return 'just now';

  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return rtf.format(seconds, 'second');
}

export function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
