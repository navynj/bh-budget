/**
 * Call GET /api/quickbooks/pnl from client/server to get P&L report (e.g. for budget).
 */

import { AppError } from '@/lib/core/errors';
import type { PnlReportData } from './parser';

export type PnlApiResponse = {
  ok: boolean;
  locationId: string;
  location: { id: string; code: string | null; name: string | null };
  startDate: string;
  endDate: string;
  accountingMethod: 'Accrual' | 'Cash';
  report: PnlReportData;
};

export async function fetchPnlReport(
  baseUrl: string,
  cookie: string | null,
  locationId: string,
  startDate: string,
  endDate: string,
  accountingMethod: 'Accrual' | 'Cash' = 'Accrual',
): Promise<PnlApiResponse> {
  const url = new URL('/api/quickbooks/pnl', baseUrl.replace(/\/$/, ''));
  url.searchParams.set('locationId', locationId);
  url.searchParams.set('startDate', startDate);
  url.searchParams.set('endDate', endDate);
  url.searchParams.set('accountingMethod', accountingMethod);

  const res = await fetch(url.toString(), {
    headers: { Cookie: cookie ?? '' },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new AppError(
      `QuickBooks P&L API failed: ${res.status} ${text || res.statusText}`,
    );
  }

  const data = (await res.json()) as PnlApiResponse;
  if (!data.report) {
    throw new AppError('QuickBooks P&L API returned no report');
  }
  return data;
}
