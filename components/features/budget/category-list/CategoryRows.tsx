import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronRight } from 'lucide-react';
import AmountPercent from './AmountPercent';
import { BudgetCategoryRow, getCategoryColor } from './helpers';

function CategoryLabel({
  categoryId,
  name,
  textClassName = '',
}: {
  categoryId: string;
  name: string;
  textClassName?: string;
}) {
  const color = getCategoryColor(categoryId);
  return (
    <>
      <span
        className="size-2.5 shrink-0 rounded-[2px]"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span className={`text-muted-foreground truncate ${textClassName}`}>{name}</span>
    </>
  );
}

function SubcategoryRow({
  sub,
  totalBudget,
  actualCosByCategoryId,
}: {
  sub: BudgetCategoryRow;
  totalBudget?: number;
  actualCosByCategoryId: Record<string, number>;
}) {
  const displayAmount =
    actualCosByCategoryId[sub.categoryId] ?? Number(sub.amount);
  const hasActualCos = sub.categoryId in actualCosByCategoryId;
  const displayPercent =
    totalBudget != null &&
    totalBudget > 0 &&
    hasActualCos
      ? (displayAmount / totalBudget) * 100
      : sub.percent;
  return (
    <li key={sub.id} className="flex justify-between gap-2 py-0.5">
      <span className="text-muted-foreground truncate text-xs">
        <span
          className="mr-1 inline-block size-2 rounded-[2px]"
          style={{ backgroundColor: getCategoryColor(sub.categoryId) }}
          aria-hidden
        />
        {sub.name}
      </span>
      <span className="shrink-0 text-xs">
        <AmountPercent
          amount={displayAmount}
          percent={displayPercent}
          className="text-xs"
        />
      </span>
    </li>
  );
}

export function CollapsibleCategoryRow({
  category,
  subcategories,
  totalBudget,
  actualCosByCategoryId = {},
}: {
  category: BudgetCategoryRow;
  subcategories: BudgetCategoryRow[];
  totalBudget?: number;
  actualCosByCategoryId?: Record<string, number>;
}) {
  const displayAmount =
    actualCosByCategoryId[category.categoryId] ?? Number(category.amount);
  const hasActualCos = category.categoryId in actualCosByCategoryId;
  const displayPercent =
    totalBudget != null &&
    totalBudget > 0 &&
    hasActualCos
      ? (displayAmount / totalBudget) * 100
      : category.percent;
  return (
    <Collapsible key={category.id} defaultOpen={false}>
      <li className="list-none">
        <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 rounded-md py-1 pr-1 text-left hover:bg-muted/50">
          <span className="flex min-w-0 items-center gap-1">
            <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
            <CategoryLabel categoryId={category.categoryId} name={category.name} />
          </span>
          <span className="shrink-0">
            <AmountPercent
              amount={displayAmount}
              percent={displayPercent}
            />
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="ml-5 mt-0.5 space-y-0.5 border-l border-muted pl-3">
            {subcategories.map((sub) => (
              <SubcategoryRow
                key={sub.id}
                sub={sub}
                totalBudget={totalBudget}
                actualCosByCategoryId={actualCosByCategoryId}
              />
            ))}
          </ul>
        </CollapsibleContent>
      </li>
    </Collapsible>
  );
}

export function StaticCategoryRow({
  category,
  totalBudget,
  actualCosByCategoryId = {},
}: {
  category: BudgetCategoryRow;
  totalBudget?: number;
  actualCosByCategoryId?: Record<string, number>;
}) {
  const displayAmount =
    actualCosByCategoryId[category.categoryId] ?? Number(category.amount);
  const hasActualCos = category.categoryId in actualCosByCategoryId;
  const displayPercent =
    totalBudget != null &&
    totalBudget > 0 &&
    hasActualCos
      ? (displayAmount / totalBudget) * 100
      : category.percent;
  return (
    <li key={category.id} className="flex items-center justify-between gap-2 py-1 pr-1">
      <span className="flex min-w-0 flex-1 items-center gap-1">
        <span className="size-4 shrink-0" aria-hidden />
        <CategoryLabel categoryId={category.categoryId} name={category.name} />
      </span>
      <span className="shrink-0">
        <AmountPercent
          amount={displayAmount}
          percent={displayPercent}
        />
      </span>
    </li>
  );
}
