import { CHART_COLORS } from '@/constants/color';
import { BudgetWithLocationAndCategories } from '@/types/budget';

export type BudgetCategoryRow = BudgetWithLocationAndCategories['categories'][number];
type CategoryGroup = {
  category: BudgetCategoryRow | null;
  subcategories: BudgetCategoryRow[];
};

/** Parse QB categoryId: qb-{catIdx}-* = category, qb-{catIdx}-{subIdx}-* = subcategory */
export function parseCategoryId(categoryId: string): {
  catIdx: number;
  subIdx?: number;
} {
  const parts = categoryId.split('-');
  if (parts.length < 2 || parts[0] !== 'qb') return { catIdx: -1 };
  const catIdx = parseInt(parts[1], 10);
  if (parts.length >= 4 && /^\d+$/.test(parts[2])) {
    return { catIdx, subIdx: parseInt(parts[2], 10) };
  }
  return { catIdx };
}

/** Group flat categories into parent + subcategories (by qb-{catIdx}-* and qb-{catIdx}-{subIdx}-*). */
export function groupCategoriesWithSubs(
  categories: BudgetCategoryRow[],
): { category: BudgetCategoryRow; subcategories: BudgetCategoryRow[] }[] {
  const byCatIdx = new Map<number, CategoryGroup>();

  for (const c of categories) {
    const { catIdx, subIdx } = parseCategoryId(c.categoryId);
    if (catIdx < 0) continue;
    const existing = byCatIdx.get(catIdx) ?? { category: null, subcategories: [] };
    if (subIdx === undefined) {
      existing.category = c;
      byCatIdx.set(catIdx, existing);
    } else {
      existing.subcategories.push(c);
      byCatIdx.set(catIdx, existing);
    }
  }

  const order = [...byCatIdx.keys()].sort((a, b) => a - b);
  return order
    .map((k) => byCatIdx.get(k)!)
    .filter(
      (group): group is { category: BudgetCategoryRow; subcategories: BudgetCategoryRow[] } =>
        group.category != null,
    );
}

export function formatPercent(percent: number | null): string | null {
  if (percent == null || !Number.isFinite(percent)) return null;
  return `${percent.toFixed(1)}%`;
}

export function getCategoryColor(categoryId: string): string {
  const { catIdx } = parseCategoryId(categoryId);
  return catIdx >= 0 ? CHART_COLORS[catIdx % CHART_COLORS.length] : 'var(--muted)';
}
