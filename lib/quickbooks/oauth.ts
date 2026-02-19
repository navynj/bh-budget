/**
 * QuickBooks token refresh and valid access token for a location.
 * Reads/writes tokens from Location in DB.
 */

import { decryptRefreshToken } from '@/lib/core/encryption';
import { AppError } from '@/lib/core/errors';
import { prisma } from '@/lib/core/prisma';
import { getQbClientCredentials } from './config';

const QB_OAUTH = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
const ACCESS_TOKEN_BUFFER_MINUTES = 5;

export async function refreshQuickBooksTokens(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const tokenToSend = decryptRefreshToken(refreshToken);
  const { clientId, clientSecret } = getQbClientCredentials();
  if (!clientId || !clientSecret) {
    throw new AppError(
      'QuickBooks not configured: set QUICKBOOKS_CLIENT_ID, QUICKBOOKS_CLIENT_SECRET',
    );
  }
  const res = await fetch(QB_OAUTH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokenToSend,
    }).toString(),
  });
  if (!res.ok) {
    const errText = await res.text();
    let errJson: { error?: string; error_description?: string } | null = null;
    try {
      errJson = JSON.parse(errText) as {
        error?: string;
        error_description?: string;
      };
    } catch {
      // ignore
    }
    const isRefreshExpired =
      res.status === 400 &&
      (errJson?.error === 'invalid_grant' ||
        /refresh_token.*expired|token.*expired/i.test(
          errJson?.error_description ?? errText,
        ));
    const detail = errJson?.error_description || errText;
    if (isRefreshExpired) {
      throw new AppError(
        `QuickBooks connection expired. Please reconnect QuickBooks for this location. (Intuit: ${errJson?.error ?? ''} – ${detail})`,
        'QB_REFRESH_EXPIRED',
      );
    }
    throw new AppError(
      `QuickBooks token refresh failed: ${res.status} ${errJson?.error ?? ''} – ${detail}`,
    );
  }
  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  return data;
}

export async function getValidAccessTokenForLocation(
  locationId: string,
): Promise<string> {
  const { hasCredentials } = getQbClientCredentials();
  if (!hasCredentials) {
    throw new AppError(
      'QuickBooks not configured: set QUICKBOOKS_CLIENT_ID, QUICKBOOKS_CLIENT_SECRET',
    );
  }
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: {
      realmId: true,
      realm: {
        select: {
          accessToken: true,
          refreshToken: true,
          expiresAt: true,
        },
      },
    },
  });
  if (!location?.realm) {
    throw new AppError('Location not found');
  }
  const realm = location.realm;
  if (!realm.refreshToken) {
    throw new AppError(
      'Location has no QuickBooks refresh token; connect QuickBooks for this location.',
    );
  }
  const nowSec = Math.floor(Date.now() / 1000);
  const expiryBufferSec = ACCESS_TOKEN_BUFFER_MINUTES * 60;
  const accessExpired =
    realm.expiresAt == null ||
    realm.expiresAt.getTime() <= nowSec + expiryBufferSec;
  if (!accessExpired && realm.accessToken) {
    return realm.accessToken;
  }
  try {
    const data = await refreshQuickBooksTokens(realm.refreshToken);
    const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000);
    await prisma.realm.update({
      where: { id: location.realmId },
      data: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt,
      },
    });
    return data.access_token;
  } catch (e) {
    if (e instanceof AppError && e.code === 'QB_REFRESH_EXPIRED') {
      throw new AppError(e.message, e.code, { locationId });
    }
    throw e;
  }
}

const QB_401_PATTERN =
  /401|Unauthorized|AuthorizationFailure|Authorization Fault/i;

export async function withValidTokenForLocation<T>(
  locationId: string,
  fn: (accessToken: string, realmId: string, classId?: string) => Promise<T>,
): Promise<T> {
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: {
      realmId: true,
      classId: true,
      realm: { select: { realmId: true, refreshToken: true } },
    },
  });
  if (!location?.realm) {
    throw new AppError('Location has no QuickBooks realm');
  }
  const realmId = decryptRefreshToken(location.realm.realmId);
  const classId = location.classId ?? undefined;

  const tryRun = async (): Promise<T> => {
    const accessToken = await getValidAccessTokenForLocation(locationId);
    return fn(accessToken, realmId, classId);
  };

  try {
    return await tryRun();
  } catch (err) {
    const is401 = err instanceof Error && QB_401_PATTERN.test(err.message);
    const refreshToken = location.realm?.refreshToken;
    if (is401 && refreshToken) {
      try {
        const data = await refreshQuickBooksTokens(refreshToken);
        const nowSec = Math.floor(Date.now() / 1000);
        await prisma.realm.update({
          where: { id: location.realmId },
          data: {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: new Date((nowSec + data.expires_in) * 1000),
          },
        });
        return tryRun();
      } catch (refreshErr) {
        const isRefreshExpired =
          refreshErr instanceof AppError &&
          (refreshErr as AppError).code === 'QB_REFRESH_EXPIRED';
        console.error('QuickBooks token refresh on 401 failed:', refreshErr);
        if (isRefreshExpired) {
          throw new AppError(
            'QuickBooks refresh token in this app is stale (the other app may have refreshed and invalidated it). ' +
              "Copy the current refresh_token from bhpnl's DB (decrypted) into this location's refresh_token, or reconnect QuickBooks for this location in this app.",
            'QB_REFRESH_EXPIRED',
            { locationId },
          );
        }
      }
    }
    throw err;
  }
}
