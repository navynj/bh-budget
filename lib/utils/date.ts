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
  return formatYearMonth(year, month + 1);
}

export function getCurrentYearMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Compare two YYYY-MM strings by date. Returns boolean */
export function isBeforeYearMonth(a: string, b: string): boolean {
  const pa = parseYearMonth(a);
  const pb = parseYearMonth(b);
  if (pa.year !== pb.year) return pa.year - pb.year < 0;
  return pa.month - pb.month < 0;
}

export function isValidYearMonth(yearMonth: string): boolean {
  const yearMonthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
  return yearMonthRegex.test(yearMonth);
}

/** List all YYYY-MM in [fromYearMonth, toYearMonth] inclusive. from must be <= to. */
export function listYearMonthsInRange(
  fromYearMonth: string,
  toYearMonth: string,
): string[] {
  if (!isValidYearMonth(fromYearMonth) || !isValidYearMonth(toYearMonth)) {
    return [];
  }
  if (isBeforeYearMonth(toYearMonth, fromYearMonth)) {
    return [];
  }
  const out: string[] = [];
  let current = fromYearMonth;
  while (current <= toYearMonth) {
    out.push(current);
    if (current === toYearMonth) break;
    const { year, month } = parseYearMonth(current);
    current = nextMonth(year, month);
  }
  return out;
}
