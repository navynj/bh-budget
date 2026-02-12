import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BudgetCategoryRow, BudgetWithLocationAndCategories } from '@/types/budget';
import { useRouter } from 'next/navigation';
import React, { useMemo } from 'react';
import UpdateBudgetButton from './UpdateBudgetButton';
import { ReconnectContent } from './BudgetReconnect';
import BudgetCategoryList from '../category-list/BudgetCategoryList';
import TotalBudgetChart from '../chart/TotalBudgetChart';
import BudgetAmountSummary from '../summary/BudgetAmountSummary';
import Link from 'next/link';
import { ArrowRightIcon } from 'lucide-react';

/** Derive display categories from current month COS (fetched from QuickBooks). Percent = category amount / Budget total. */
function deriveDisplayCategories(
  currentCosByCategory: { categoryId: string; name: string; amount: number }[] | undefined,
  totalBudget: number,
): BudgetCategoryRow[] {
  if (!currentCosByCategory?.length) return [];
  const hasBudget = Number.isFinite(totalBudget) && totalBudget > 0;
  return currentCosByCategory.map((c) => ({
    id: c.categoryId,
    categoryId: c.categoryId,
    name: c.name,
    amount: c.amount,
    percent: hasBudget ? (c.amount / totalBudget) * 100 : null,
  }));
}

function BudgetCard({
  b,
  isOfficeOrAdmin,
  yearMonth,
  needsReconnect = false,
}: {
  b: BudgetWithLocationAndCategories;
  isOfficeOrAdmin: boolean;
  yearMonth: string;
  needsReconnect?: boolean;
}) {
  const router = useRouter();
  const [updating, setUpdating] = React.useState(false);
  const [optimisticRate, setOptimisticRate] = React.useState<number | null>(
    null,
  );
  const [optimisticPeriod, setOptimisticPeriod] = React.useState<number | null>(
    null,
  );

  const totalAmount =
    typeof b.totalAmount === 'number' ? b.totalAmount : Number(b.totalAmount);
  // Use actual Cost of Sales for this month from QuickBooks when available
  const currentCosTotal =
    typeof b.currentCosTotal === 'number' && Number.isFinite(b.currentCosTotal)
      ? b.currentCosTotal
      : 0;
  const displayCategories = useMemo(
    () => deriveDisplayCategories(b.currentCosByCategory, totalAmount),
    [b.currentCosByCategory, totalAmount],
  );

  const displayRate =
    optimisticRate != null
      ? optimisticRate
      : (b.budgetRateUsed as number | null);
  const displayPeriod =
    optimisticPeriod != null ? optimisticPeriod : b.referencePeriodMonthsUsed;

  const onUpdateStart = React.useCallback((rate?: number, period?: number) => {
    setUpdating(true);
    setOptimisticRate(rate ?? null);
    setOptimisticPeriod(period ?? null);
  }, []);
  const onUpdateSuccess = React.useCallback(() => {
    router.refresh();
    setUpdating(false);
    setOptimisticRate(null);
    setOptimisticPeriod(null);
  }, [router]);
  const onUpdateError = React.useCallback(() => {
    setUpdating(false);
    setOptimisticRate(null);
    setOptimisticPeriod(null);
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold w-full">
          <Link
            href={`/budget/location/${b.locationId}?yearMonth=${yearMonth}`}
            className="group w-full link-underline-anim !flex items-center justify-between gap-2"
          >
            <span>{b.location?.code ?? b.location?.name ?? b.locationId}</span>
            <ArrowRightIcon className="size-4 shrink-0 opacity-0 -translate-x-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:translate-x-0" />
          </Link>
        </CardTitle>
        {isOfficeOrAdmin && !needsReconnect && (
          <UpdateBudgetButton
            locationId={b.locationId}
            yearMonth={yearMonth}
            onUpdateStart={onUpdateStart}
            onUpdateSuccess={onUpdateSuccess}
            onUpdateError={onUpdateError}
          />
        )}
      </CardHeader>
      <CardContent className="h-full">
        <BudgetAmountSummary
          isUpdating={updating}
          needsReconnect={needsReconnect}
          currentCosTotal={currentCosTotal}
          totalBudget={totalAmount}
          displayRate={displayRate}
          displayPeriod={displayPeriod}
        />
        <TotalBudgetChart
          totalAmount={totalAmount}
          currentCosTotal={currentCosTotal}
          currentCosByCategory={b.currentCosByCategory}
        />
        <BudgetCategoryList
          categories={displayCategories}
          totalBudget={totalAmount}
          currentCosByCategory={b.currentCosByCategory}
        />
        {needsReconnect && (
          <ReconnectContent
            locationId={b.locationId}
            showButton={isOfficeOrAdmin}
          />
        )}
      </CardContent>
    </Card>
  );
}

export default BudgetCard;
