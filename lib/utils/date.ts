export function parseYearMonth(yearMonth: string): {
  year: number;
  month: number;
} {
  const [y, m] = yearMonth.split('-').map(Number);
  return {
    year: y ?? new Date().getFullYear(),
    month: (m ?? new Date().getMonth() + 1) - 1,
  };
}

export function formatYearMonth(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

export function prevMonth(year: number, month: number): string {
  if (month === 0) return formatYearMonth(year - 1, 11);
  return formatYearMonth(year, month - 1);
}

export function nextMonth(year: number, month: number): string {
  if (month === 11) return formatYearMonth(year + 1, 0);
  return formatYearMonth(year, month);
}

export function getCurrentYearMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function isValidYearMonth(yearMonth: string): boolean {
  const yearMonthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
  return yearMonthRegex.test(yearMonth);
}
