import { decryptRefreshToken } from '@/lib/encryption';
import { AppError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import {
  fetchProfitAndLossReport,
  isQuickBooksConfigured,
  withValidTokenForLocation,
} from '@/lib/quickbooks';
import type { Prisma } from '@prisma/client';
import type { BudgetDataType } from '@/types/budget';
import { formatYearMonth, parseYearMonth, isValidYearMonth } from './utils';

const DEFAULT_BUDGET_RATE = 0.33;
const DEFAULT_REFERENCE_PERIOD_MONTHS = 6;

/** Reference income total and COS per category for budget calculation. */
export type ReferenceData = {
  incomeTotal?: number;
  cosTotal?: number;
  cosByCategory?: { categoryId: string; name: string; amount: number }[];
};

/**
 * Compute start_date and end_date (YYYY-MM-DD) for a reference period of the last N months
 * *before* endYearMonth (i.e. ending at the previous month, not including endYearMonth).
 * Example: endYearMonth=2025-02, months=6 → 2024-08-01 ~ 2025-01-31 (Aug through Jan).
 */
function referencePreviousMonthRange(
  endYearMonth: string,
  monthRange: number,
): {
  startDate: string;
  endDate: string;
} {
  const [y, m] = endYearMonth.split('-').map(Number);
  const month0 = (m ?? 1) - 1;

  // End of reference period = last day of the month *before* endYearMonth
  const endOfRef = new Date(y, month0, 0); // day 0 = last day of previous month

  const endYear = endOfRef.getFullYear();
  const endMonth0 = endOfRef.getMonth();
  const lastDay = endOfRef.getDate();

  const start = new Date(endYear, endMonth0, 1);
  start.setMonth(start.getMonth() - monthRange + 1);

  const pad = (n: number) => String(n).padStart(2, '0');

  return {
    startDate: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-01`,
    endDate: `${endYear}-${pad(endMonth0 + 1)}-${pad(lastDay)}`,
  };
}

function referenceCurrentMonthRange(yearMonth: string): {
  startDate: string;
  endDate: string;
} {
  const [y, m] = yearMonth.split('-').map(Number);
  const start = new Date(y, m - 1, 1);
  let current = new Date();

  if (y !== current.getFullYear() || current.getMonth() !== m - 1) {
    current = new Date(y, m, 0);
  }

  const result = {
    startDate: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`,
    endDate: `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`,
  };

  return {
    startDate: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`,
    endDate: `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`,
  };
}

/** Get the realmId for a location. Throws AppError when QB not configured or location has no realm. */
export async function getRealmIdByLocation(
  locationId: string,
): Promise<string> {
  if (!isQuickBooksConfigured()) {
    throw new AppError('QuickBooks is not configured');
  }

  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { realmId: true },
  });

  if (!location?.realmId) {
    throw new AppError('Location has no QuickBooks realm');
  }

  return decryptRefreshToken(location.realmId);
}

/** Fetch reference income and Cost of Sales from QuickBooks P&L. Throws AppError when QB not configured, location has no realm, or fetch fails. */
export async function getReferenceIncomeAndCos(
  _userId: string,
  locationId: string,
  endYearMonth: string,
  months: number,
): Promise<ReferenceData> {
  if (!isQuickBooksConfigured()) {
    throw new AppError('QuickBooks is not configured');
  }
  const { startDate, endDate } = referencePreviousMonthRange(
    endYearMonth,
    months,
  );

  try {
    return await withValidTokenForLocation(locationId, (accessToken, realmId) =>
      fetchProfitAndLossReport(
        realmId,
        startDate,
        endDate,
        'Accrual',
        'income,cos',
        accessToken,
      ),
    );
  } catch (err) {
    console.error('QuickBooks P&L fetch failed:', err);
    const message =
      err instanceof Error ? err.message : 'QuickBooks P&L fetch failed';
    const code = err instanceof AppError ? err.code : undefined;
    const details =
      err instanceof AppError && err.details
        ? { ...err.details, locationId }
        : { locationId };
    throw new AppError(message, code, details);
  }
}

/** Fetch reference COS from QuickBooks P&L for one month. Throws AppError when QB not configured, location has no realm/token, or fetch fails. */
export async function getCurrentMonthCos(
  locationId: string,
  date: { year: number; month: number },
  months: number,
): Promise<{
  cosTotal?: number;
  cosByCategory?: { categoryId: string; name: string; amount: number }[];
}> {
  const dateString = formatYearMonth(date.year, date.month);
  const { startDate, endDate } = referenceCurrentMonthRange(dateString);

  const report = await withValidTokenForLocation(
    locationId,
    (accessToken, realmId) =>
      fetchProfitAndLossReport(
        realmId,
        startDate,
        endDate,
        'Accrual',
        'cos',
        accessToken,
      ),
  );
  const cosByCategory = report.cosByCategory ?? [];
  // Use the P&L section total (single source of truth). Summing cosByCategory would double-count
  // because it includes both parent category rows and subcategory rows.
  const cosTotal =
    report.cosTotal != null && Number.isFinite(report.cosTotal)
      ? report.cosTotal
      : cosByCategory.reduce((s, c) => s + c.amount, 0);

  return { cosTotal, cosByCategory };
}

/** Get or create the single BudgetSettings row (default rate 33%, reference 6 months). */
export async function getOrCreateBudgetSettings() {
  let settings = await prisma.budgetSettings.findFirst();
  if (!settings) {
    settings = await prisma.budgetSettings.create({
      data: {
        budgetRate: DEFAULT_BUDGET_RATE,
        referencePeriodMonths: DEFAULT_REFERENCE_PERIOD_MONTHS,
      },
    });
  }
  return settings;
}

/** Compute total budget from reference income and rate. */
export function computeTotalBudget(
  incomeTotal: number,
  rate: number,
  referenceMonths: number,
): number {
  if (referenceMonths <= 0) return 0;
  const averageMonthlyIncome = incomeTotal / referenceMonths;
  return Math.round(averageMonthlyIncome * rate);
}

/** Distribute total budget to categories by COS percentage. */
export function distributeByCosPercent(
  totalBudget: number,
  cosByCategory: { categoryId: string; name: string; amount: number }[],
): {
  categoryId: string;
  name: string;
  amount: number;
  percent: number | null;
}[] {
  const totalCos = cosByCategory.reduce((s, c) => s + c.amount, 0);
  if (totalCos <= 0) {
    return cosByCategory.map((c) => ({ ...c, amount: 0, percent: null }));
  }
  return cosByCategory.map((c) => {
    const percent = (c.amount / totalCos) * 100;
    const amount = Math.round(totalBudget * (c.amount / totalCos) * 100) / 100;
    return { categoryId: c.categoryId, name: c.name, amount, percent };
  });
}

export type CreateBudgetInput = {
  locationId: string;
  yearMonth: string;
  userId: string;
  budgetRate?: number;
  referencePeriodMonths?: number;
  /** If provided, use this instead of fetching from QB. */
  referenceData?: ReferenceData;
};

type BudgetWithLocationRaw = Prisma.BudgetGetPayload<{
  include: { location: true };
}>;

/** Create or update a budget row with error set (e.g. QB_REFRESH_EXPIRED). Used when full creation fails so the card still appears in list. */
async function upsertBudgetStubWithError(
  locationId: string,
  yearMonth: string,
  errorCode: string,
): Promise<BudgetWithLocationRaw> {
  const existing = await prisma.budget.findUnique({
    where: { locationId_yearMonth: { locationId, yearMonth } },
    include: { location: true },
  });
  if (existing) {
    await prisma.budget.update({
      where: { id: existing.id },
      data: {
        totalAmount: 0,
        budgetRateUsed: null,
        referencePeriodMonthsUsed: null,
        error: errorCode,
      },
    });
    return prisma.budget.findUniqueOrThrow({
      where: { id: existing.id },
      include: { location: true },
    });
  }
  return prisma.budget.create({
    data: {
      location: { connect: { id: locationId } },
      yearMonth,
      totalAmount: 0,
      budgetRateUsed: null,
      referencePeriodMonthsUsed: null,
      error: errorCode,
    },
    include: { location: true },
  });
}

/**
 * Ensure budget exists for location + yearMonth. Uses settings (or overrides), fetches reference
 * income if not provided, then creates/updates Budget record. Category list/amounts are derived
 * from QuickBooks COS fetch on each page load.
 * On QB_REFRESH_EXPIRED creates a stub budget with error set so the card still appears. Other errors throw.
 */
export async function ensureBudgetForMonth(
  input: CreateBudgetInput,
): Promise<BudgetWithLocationRaw> {
  const { locationId, yearMonth, userId, referenceData: providedRef } = input;
  if (!isValidYearMonth(yearMonth)) {
    throw new AppError('Invalid yearMonth; use YYYY-MM');
  }

  try {
    const existing = await prisma.budget.findUnique({
      where: { locationId_yearMonth: { locationId, yearMonth } },
      include: { location: true },
    });

    const settings = await getOrCreateBudgetSettings();
    const rate = input.budgetRate ?? Number(settings.budgetRate);
    const refMonths =
      input.referencePeriodMonths ?? settings.referencePeriodMonths;

    const ref =
      providedRef ??
      (await getReferenceIncomeAndCos(
        userId,
        locationId,
        yearMonth,
        refMonths,
      ));

    const totalAmount = computeTotalBudget(
      ref.incomeTotal ?? 0,
      rate,
      refMonths,
    );

    if (existing) {
      await prisma.budget.update({
        where: { id: existing.id },
        data: {
          totalAmount,
          budgetRateUsed: rate,
          referencePeriodMonthsUsed: refMonths,
          error: null,
        },
      });
      return prisma.budget.findUniqueOrThrow({
        where: { id: existing.id },
        include: { location: true },
      });
    }

    return prisma.budget.create({
      data: {
        location: { connect: { id: locationId } },
        yearMonth,
        totalAmount,
        budgetRateUsed: rate,
        referencePeriodMonthsUsed: refMonths,
      },
      include: { location: true },
    });
  } catch (e) {
    if (e instanceof AppError && e.code === 'QB_REFRESH_EXPIRED') {
      return upsertBudgetStubWithError(
        locationId,
        yearMonth,
        'QB_REFRESH_EXPIRED',
      );
    }
    throw e;
  }
}

/** Raw budget row from Prisma (with location). */
type RawBudgetWithInclude =
  Awaited<
    ReturnType<
      typeof prisma.budget.findFirst<{
        include: { location: true };
      }>
    >
  > extends infer R
    ? R extends null
      ? never
      : R
    : never;

/** Map a raw Prisma budget (with include) to BudgetDataType (numbers for decimals). */
export function mapBudgetToDataType(raw: RawBudgetWithInclude): BudgetDataType {
  return {
    id: raw.id,
    locationId: raw.locationId,
    yearMonth: raw.yearMonth,
    totalAmount: Number(raw.totalAmount),
    budgetRateUsed:
      raw.budgetRateUsed != null ? Number(raw.budgetRateUsed) : null,
    referencePeriodMonthsUsed: raw.referencePeriodMonthsUsed,
    error: raw.error ?? null,
    location: raw.location,
    categories: [],
  };
}

/** Get budget for a location and month (for display). Returns mapped BudgetDataType. */
export async function getBudgetByLocationAndMonth(
  locationId: string,
  yearMonth: string,
): Promise<BudgetDataType | null> {
  const raw = await prisma.budget.findUnique({
    where: { locationId_yearMonth: { locationId, yearMonth } },
    include: { location: true },
  });
  return raw ? mapBudgetToDataType(raw) : null;
}

/** Attach actual COS for the given month to each budget. Catches per-location so one failure does not break the list. */
export async function attachCurrentMonthCosToBudgets<
  T extends { locationId: string },
>(
  budgets: T[],
  yearMonth: string,
): Promise<
  (T & {
    currentCosTotal?: number;
    currentCosByCategory?: {
      categoryId: string;
      name: string;
      amount: number;
    }[];
  })[]
> {
  if (!isValidYearMonth(yearMonth))
    return budgets as (T & {
      currentCosTotal?: number;
      currentCosByCategory?: {
        categoryId: string;
        name: string;
        amount: number;
      }[];
    })[];
  const { year, month } = parseYearMonth(yearMonth);
  const results = await Promise.allSettled(
    budgets.map(async (b) =>
      getCurrentMonthCos(b.locationId, { year, month }, 1),
    ),
  );
  return budgets.map((b, i) => {
    const r = results[i];
    if (r.status === 'fulfilled' && r.value.cosByCategory) {
      return {
        ...b,
        currentCosTotal:
          r.value.cosTotal ??
          r.value.cosByCategory.reduce((s, c) => s + c.amount, 0),
        currentCosByCategory: r.value.cosByCategory,
      };
    }
    return b;
  });
}

/** List all budgets for a given yearMonth (for office/admin). Ordered by location.createdAt. */
export async function getBudgetsByMonth(
  yearMonth: string,
): Promise<BudgetDataType[]> {
  const raw = await prisma.budget.findMany({
    where: { yearMonth },
    include: { location: true },
    orderBy: { location: { createdAt: 'asc' } },
  });
  return raw.map(mapBudgetToDataType);
}

/** Ensure budgets exist for all locations for the given month (used when office/admin views month). Runs each location independently so other budgets can still be viewed. Creates a stub with error when QB_REFRESH_EXPIRED so every location has a budget row (ordered by location.createdAt). */
export async function ensureBudgetsForMonth(
  yearMonth: string,
  userId: string,
): Promise<void> {
  if (!isValidYearMonth(yearMonth)) return;
  const locations = await prisma.location.findMany({
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });

  await Promise.all(
    locations.map(async (loc) => {
      const existing = await prisma.budget.findUnique({
        where: { locationId_yearMonth: { locationId: loc.id, yearMonth } },
        select: { id: true, error: true },
      });
      // Run when no budget exists or when budget has error (retry on every reload until QB reconnected)
      if (!existing || existing.error != null) {
        await ensureBudgetForMonth({
          locationId: loc.id,
          yearMonth,
          userId,
        });
      }
    }),
  );
}

/** Fetch id, code, name for locations by IDs (e.g. for reconnect placeholder labels). */
export async function getLocationsByIds(
  ids: string[],
): Promise<{ id: string; code: string; name: string }[]> {
  if (ids.length === 0) return [];
  const rows = await prisma.location.findMany({
    where: { id: { in: ids } },
    select: { id: true, code: true, name: true },
  });
  return rows;
}
