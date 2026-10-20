const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** 로컬 날짜를 YYYY-MM-DD로 */
export function toISODate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseISODate(value: string) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** 오늘부터 그날까지 남은 날 수. 지났으면 음수. */
export function daysUntil(value: string, today = new Date()) {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((parseISODate(value).getTime() - start.getTime()) / 86_400_000);
}

export function dDayLabel(value: string, today = new Date()) {
  const days = daysUntil(value, today);
  if (days === 0) return 'D-DAY';
  return days > 0 ? `D-${days}` : `D+${-days}`;
}

export function formatDate(value: string) {
  const date = parseISODate(value);
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${WEEKDAYS[date.getDay()]})`;
}

export function weekdayOf(date: Date) {
  return WEEKDAYS[date.getDay()];
}
