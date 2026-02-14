import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ===============================
// Class name helper
// ===============================
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ===============================
// Date helpers
// ===============================
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

export function isValidYearMonth(yearMonth: string): boolean {
  const yearMonthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
  return yearMonthRegex.test(yearMonth);
}

// ===============================
// Format helpers
// ===============================
export function formatCurrency(n: number) {
  return (
    '$' +
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n)
  );
}

// ===============================
// Category helpers
// ===============================
/** Only top-level COS categories (path length 1) are shown in the chart. */

/** Path from root: leading numeric segments after "qb" (e.g. qb-0-0-0 → [0,0,0], qb-0-COS1 → [0]). */
export function parseCategoryPath(categoryId: string): number[] {
  const parts = categoryId.split('-');
  if (parts.length < 2 || parts[0] !== 'qb') return [];
  const path: number[] = [];
  for (let i = 1; i < parts.length; i++) {
    if (/^\d+$/.test(parts[i])) path.push(parseInt(parts[i], 10));
    else break;
  }
  return path;
}

export const isTopLevelCategory = (categoryId: string) =>
  parseCategoryPath(categoryId).length === 1;

export const getTopLevelCategoryIndex = (categoryId: string): number => {
  const path = parseCategoryPath(categoryId);
  if (path.length === 0) return Number.MAX_SAFE_INTEGER;
  return path[0] ?? Number.MAX_SAFE_INTEGER;
};

export const getTopLevelCategories = (
  categories: { categoryId: string; name: string; amount: number }[],
) => {
  return [...categories]
    .filter((c) => isTopLevelCategory(c.categoryId))
    .sort(
      (a, b) =>
        getTopLevelCategoryIndex(a.categoryId) -
        getTopLevelCategoryIndex(b.categoryId),
    )
    .map((c) => ({ category: c.name, cos: c.amount }))
    .filter((c) => Number.isFinite(c.cos) && c.cos > 0);
};
