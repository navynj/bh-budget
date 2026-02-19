/**
 * QuickBooks environment, base URLs, redirect URI, scopes, and OAuth client config.
 * Env: QUICKBOOKS_CLIENT_ID, QUICKBOOKS_CLIENT_SECRET, QUICKBOOKS_ENVIRONMENT;
 * optional QUICKBOOKS_*_SANDBOX for sandbox; QUICKBOOKS_REDIRECT_URI or NEXT_PUBLIC_APP_URL.
 */

import { AppError } from '@/lib/core/errors';
import OAuthClient from 'intuit-oauth';

const QB_ENV = process.env.QUICKBOOKS_ENVIRONMENT || 'sandbox';
const QB_BASE =
  QB_ENV === 'production'
    ? 'https://quickbooks.api.intuit.com'
    : 'https://sandbox-quickbooks.api.intuit.com';

/** Base URL for QuickBooks company API (reports). */
export function getQuickBooksReportBaseUrl(): string {
  return QB_BASE;
}

/** Resolve client id/secret for current QUICKBOOKS_ENVIRONMENT (production vs sandbox). */
export function getQbClientCredentials(): {
  clientId: string | undefined;
  clientSecret: string | undefined;
  hasCredentials: boolean;
} {
  const isProd = QB_ENV === 'production';
  const clientId = isProd
    ? process.env.QUICKBOOKS_CLIENT_ID
    : (process.env.QUICKBOOKS_CLIENT_ID_SANDBOX ??
      process.env.QUICKBOOKS_CLIENT_ID);
  const clientSecret = isProd
    ? process.env.QUICKBOOKS_CLIENT_SECRET
    : (process.env.QUICKBOOKS_CLIENT_SECRET_SANDBOX ??
      process.env.QUICKBOOKS_CLIENT_SECRET);
  return {
    clientId,
    clientSecret,
    hasCredentials: !!clientId && !!clientSecret,
  };
}

/**
 * Redirect URI for QuickBooks OAuth. Used by connect flow and callback.
 */
export function getQuickBooksRedirectUri(): string {
  return (
    process.env.QUICKBOOKS_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_APP_URL}/api/quickbooks/auth/callback`
  );
}

export const QUICKBOOKS_SCOPES = {
  Accounting: 'com.intuit.quickbooks.accounting',
  Payment: 'com.intuit.quickbooks.payment',
  Payroll: 'com.intuit.quickbooks.payroll',
  TimeTracking: 'com.intuit.quickbooks.payroll.timetracking',
  Benefits: 'com.intuit.quickbooks.payroll.benefits',
  OpenId: 'openid',
  Profile: 'profile',
  Email: 'email',
  Phone: 'phone',
  Address: 'address',
  IntuitName: 'intuit_name',
} as const;

export function getDefaultQuickBooksScopes(): string[] {
  return [QUICKBOOKS_SCOPES.Accounting];
}

/**
 * Configured QuickBooks OAuth client for authorize URL and token exchange.
 * @throws AppError if client id/secret not set
 */
export function getQuickBooksOAuthClient(): OAuthClient {
  const { clientId, clientSecret, hasCredentials } = getQbClientCredentials();
  if (!hasCredentials || !clientId || !clientSecret) {
    throw new AppError(
      'QuickBooks not configured: set QUICKBOOKS_CLIENT_ID and QUICKBOOKS_CLIENT_SECRET (or *_SANDBOX for sandbox)',
    );
  }
  return new OAuthClient({
    clientId,
    clientSecret,
    environment: QB_ENV as 'sandbox' | 'production',
    redirectUri: getQuickBooksRedirectUri(),
  });
}

export function isQuickBooksConfigured(): boolean {
  return getQbClientCredentials().hasCredentials;
}
