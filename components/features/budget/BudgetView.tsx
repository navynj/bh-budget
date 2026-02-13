'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { TruncateWithTooltip } from '@/components/ui/truncate-with-tooltip';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import React from 'react';

type BudgetCategoryRow = {
  id: string;
  categoryId: string;
  name: string;
  amount: unknown;
  percent: number | null;
};

type BudgetWithLocationAndCategories = {
  id: string;
  locationId: string;
  yearMonth: string;
  totalAmount: unknown;
  budgetRateUsed: unknown;
  referencePeriodMonthsUsed: number | null;
  location: { id: string; code: string; name: string } | null;
  categories: BudgetCategoryRow[];
};

type BudgetViewProps = {
  yearMonth: string;
  isOfficeOrAdmin: boolean;
  budget: BudgetWithLocationAndCategories | null;
  budgets: BudgetWithLocationAndCategories[];
  locationId: string | null;
  /** Shown when budget create/get failed (e.g. QuickBooks not configured). */
  budgetError?: string | null;
  /** When set (e.g. QB_REFRESH_EXPIRED), show a "Reconnect QuickBooks" button linking to OAuth. */
  reconnectLocationId?: string | null;
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

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
            formatCurrency(totalAmount)
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

function UpdateBudgetButton({
  locationId,
  yearMonth,
  onUpdateStart,
  onUpdateSuccess,
  onUpdateError,
}: {
  locationId: string;
  yearMonth: string;
  onUpdateStart: (rate?: number, period?: number) => void;
  onUpdateSuccess: () => void;
  onUpdateError: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
        Update budget
      </Button>
      {open && (
        <UpdateBudgetModal
          locationId={locationId}
          yearMonth={yearMonth}
          onClose={() => setOpen(false)}
          onUpdateStart={onUpdateStart}
          onUpdateSuccess={onUpdateSuccess}
          onUpdateError={onUpdateError}
        />
      )}
    </>
  );
}

function UpdateBudgetModal({
  locationId,
  yearMonth,
  onClose,
  onUpdateStart,
  onUpdateSuccess,
  onUpdateError,
}: {
  locationId: string;
  yearMonth: string;
  onClose: () => void;
  onUpdateStart: (rate?: number, period?: number) => void;
  onUpdateSuccess: () => void;
  onUpdateError: () => void;
}) {
  const [rate, setRate] = React.useState('');
  const [period, setPeriod] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setLoading(true);
    const rateNum = rate ? Number(rate) / 100 : undefined;
    const periodNum = period ? Number(period) : undefined;
    onUpdateStart(rateNum, periodNum);
    try {
      const res = await fetch(`/api/budget/${locationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yearMonth,
          ...(rateNum != null ? { budgetRate: rateNum } : {}),
          ...(periodNum != null ? { referencePeriodMonths: periodNum } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Update failed');
      onUpdateSuccess();
      onClose();
    } catch (e) {
      console.error(e);
      onUpdateError();
      setError(
        e instanceof Error
          ? e.message?.length < 100
            ? e.message
            : 'Update failed'
          : 'Update failed',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border-border w-full max-w-sm rounded-lg border p-4 shadow-lg">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg">Update budget</h3>
          {yearMonth && (
            <p className="text-muted-foreground text-sm">for {yearMonth}</p>
          )}
        </div>
        <div className="mt-3 space-y-2">
          <label className="text-sm">
            Budget rate{' '}
            <span className="text-muted-foreground text-xs">(% of income)</span>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              placeholder="e.g. 33"
              className="border-input mt-1 w-full rounded border px-2 py-1"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </label>
          <label className="text-sm">
            Reference period{' '}
            <span className="text-muted-foreground text-xs">(months)</span>
            <input
              type="number"
              min={1}
              max={24}
              placeholder="e.g. 6"
              className="border-input mt-1 w-full rounded border px-2 py-1"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            />
          </label>
        </div>
        {error && (
          <p className="text-destructive mt-4 text-sm text-right">{error}</p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={loading}>
            {loading ? <Spinner /> : 'Update'}
          </Button>
        </div>
      </div>
    </div>
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
                href={`/api/quickbook/connect?locationId=${encodeURIComponent(reconnectLocationId)}`}
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
