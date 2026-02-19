'use client';

import UpdateBudgetButton from '@/components/features/budget/card/UpdateBudgetButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { TruncateWithTooltip } from '@/components/ui/truncate-with-tooltip';
import type {
  BudgetCategoryRow,
  BudgetViewProps,
  BudgetWithLocationAndCategories,
} from '@/lib/budget';
import { cn, formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import React from 'react';

function BudgetCard({
  budget,
  isOfficeOrAdmin,
  yearMonth,
}: {
  budget: BudgetWithLocationAndCategories;
  isOfficeOrAdmin: boolean;
  yearMonth: string;
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
    typeof budget.totalAmount === 'number'
      ? budget.totalAmount
      : Number(budget.totalAmount);
  const categories = budget.categories ?? [];

  const displayRate =
    optimisticRate != null
      ? optimisticRate
      : (budget.budgetRateUsed as number | null);
  const displayPeriod =
    optimisticPeriod != null
      ? optimisticPeriod
      : budget.referencePeriodMonthsUsed;

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
        <CardTitle className="text-base font-medium">
          {budget.location?.code ?? budget.location?.name ?? budget.locationId}{' '}
          Budget
        </CardTitle>
        {isOfficeOrAdmin && (
          <UpdateBudgetButton
            locationId={budget.locationId}
            yearMonth={yearMonth}
            currentBudgetRate={
              typeof budget.budgetRateUsed === 'number'
                ? budget.budgetRateUsed
                : null
            }
            currentReferencePeriodMonths={budget.referencePeriodMonthsUsed}
            onUpdateStart={onUpdateStart}
            onUpdateSuccess={onUpdateSuccess}
            onUpdateError={onUpdateError}
          />
        )}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">
          {updating ? (
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <Spinner className="size-5 " />
              <span>Updating…</span>
            </span>
          ) : (
            formatCurrency(Number(totalAmount))
          )}
        </p>
        {(displayRate != null || displayPeriod != null) && (
          <p className="text-muted-foreground text-xs">
            {displayRate != null && `Rate: ${(displayRate * 100).toFixed(0)}%`}
            {displayPeriod != null &&
              `${displayRate != null ? ' · ' : ''}Ref: ${displayPeriod} months`}
          </p>
        )}
        {categories.length > 0 && (
          <ul className="mt-3 space-y-1 border-t pt-3 text-sm">
            {categories.map((c) => (
              <li key={c.id} className="flex justify-between gap-2">
                <TruncateWithTooltip
                  content={c.name}
                  className="text-muted-foreground"
                />
                <span className="shrink-0">
                  {formatCurrency(Number(c.amount))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function BudgetView({
  yearMonth,
  isOfficeOrAdmin,
  budget,
  budgets,
  budgetError,
  reconnectLocationId,
}: BudgetViewProps) {
  const errorBlock =
    budgetError != null && budgetError !== '' ? (
      <div
        role="alert"
        className="flex justify-between  items-center rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-destructive text-sm"
      >
        <div>
          <strong>Failed to create or load budget.</strong> {budgetError}
        </div>
        {reconnectLocationId != null && reconnectLocationId !== '' && (
          <div>
            <Button asChild variant="destructive" size="sm">
              <a
                href={`/api/quickbooks/auth?locationId=${encodeURIComponent(reconnectLocationId)}`}
              >
                Reconnect QuickBooks
              </a>
            </Button>
          </div>
        )}
      </div>
    ) : null;

  if (isOfficeOrAdmin) {
    if (budgets.length === 0) {
      return (
        <div className="space-y-3">
          {errorBlock}
          <p className="text-muted-foreground">
            No budgets for this month. They are created automatically when you
            visit.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {errorBlock}
        <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3')}>
          {budgets.map((b) => (
            <BudgetCard
              key={b.id}
              budget={b}
              isOfficeOrAdmin={isOfficeOrAdmin}
              yearMonth={yearMonth}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="space-y-3">
        {errorBlock}
        <p className="text-muted-foreground">
          No budget for your location this month.
          <br />
          Please contact to the administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {errorBlock}
      <div className="max-w-full">
        <BudgetCard
          budget={budget}
          isOfficeOrAdmin={false}
          yearMonth={yearMonth}
        />
      </div>
    </div>
  );
}
