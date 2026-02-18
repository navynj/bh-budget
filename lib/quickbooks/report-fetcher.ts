/**
 * Fetch P&L report from QuickBooks company API. Only used by /api/quickbooks route handlers.
 * All HTTP requests to the QuickBooks company API (reports) should be triggered from routes.
 */

import { decryptRefreshToken } from '@/lib/core/encryption';
import { AppError } from '@/lib/core/errors';
import { getQuickBooksReportBaseUrl } from './config';
import type { QuickBooksProfitAndLossRaw } from './parser';

const QB_FETCH_TIMEOUT_MS = 25_000;

export async function fetchProfitAndLossReportFromQb(
  realmId: string,
  startDate: string,
  endDate: string,
  accountingMethod: 'Accrual' | 'Cash',
  accessToken: string,
  classId?: string,
): Promise<QuickBooksProfitAndLossRaw> {
  const resolvedRealmId = decryptRefreshToken(realmId);
  const base = getQuickBooksReportBaseUrl();
  const url = `${base}/v3/company/${resolvedRealmId}/reports/ProfitAndLoss?start_date=${startDate}&end_date=${endDate}&accounting_method=${accountingMethod}${classId ? `&class=${classId}` : ''}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), QB_FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof Error && e.name === 'AbortError') {
      throw new AppError(
        'QuickBooks P&L request timed out. The service may be slow or unreachable.',
      );
    }
    throw e;
  }
  clearTimeout(timeoutId);

  if (res.status === 401) {
    const err = await res.text();
    throw new AppError(
      `QuickBooks P&L request failed: 401 Unauthorized. ${err}. ` +
        "Ensure this app uses the same QuickBooks client id/secret as the connection, and that the location's realmId matches the connected company. Try reconnecting QuickBooks for this location.",
    );
  }

  if (!res.ok) {
    const err = await res.text();
    throw new AppError(`QuickBooks P&L request failed: ${res.status} ${err}`);
  }

  return (await res.json()) as QuickBooksProfitAndLossRaw;
}
