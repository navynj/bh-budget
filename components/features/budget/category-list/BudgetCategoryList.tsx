import { CollapsibleCategoryRow, StaticCategoryRow } from './CategoryRows';
import { type BudgetCategoryRow, groupCategoriesWithSubs } from './helpers';

/** Map categoryId -> actual COS amount for the displayed month (from QuickBooks). */
function cosByCategoryToMap(
  currentCosByCategory?: { categoryId: string; name: string; amount: number }[],
): Record<string, number> {
  if (!currentCosByCategory?.length) return {};
  return Object.fromEntries(
    currentCosByCategory.map((c) => [c.categoryId, c.amount]),
  );
}

function BudgetCategoryList({
  categories,
  totalBudget,
  currentCosByCategory,
}: {
  categories: BudgetCategoryRow[];
  /** Total budget (used for category percent: category amount / total budget). */
  totalBudget?: number;
  currentCosByCategory?: { categoryId: string; name: string; amount: number }[];
}) {
  if (categories.length === 0) return null;
  const actualCosByCategoryId = cosByCategoryToMap(currentCosByCategory);

  return (
    <ul className="mt-3 space-y-0 border-t pt-3 text-sm">
      {groupCategoriesWithSubs(categories).map(({ category, subcategories }) =>
        subcategories.length > 0 ? (
          <CollapsibleCategoryRow
            key={category.id}
            category={category}
            subcategories={subcategories}
            totalBudget={totalBudget}
            actualCosByCategoryId={actualCosByCategoryId}
          />
        ) : (
          <StaticCategoryRow
            key={category.id}
            category={category}
            totalBudget={totalBudget}
            actualCosByCategoryId={actualCosByCategoryId}
          />
        ),
      )}
    </ul>
  );
}

export default BudgetCategoryList;
