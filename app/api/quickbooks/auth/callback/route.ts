/**
 * GET /api/quickbooks/auth/callback?code=...&realmId=...&state=locationId
 * Exchanges authorization code for tokens, upserts Realm, and links Location to Realm.
 */
import { AppError } from '@/lib/core/errors';
import { prisma } from '@/lib/core/prisma';
import { getQuickBooksOAuthClient } from '@/lib/quickbooks';
import { NextRequest, NextResponse } from 'next/server';

const QB_CALLBACK_ERROR_CODE = 'QB_CALLBACK_ERROR';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const realmIdParam = searchParams.get('realmId');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    const desc = searchParams.get('error_description');
    console.error(
      `QuickBooks OAuth callback error [${QB_CALLBACK_ERROR_CODE}]:`,
      error,
      desc,
    );
    return NextResponse.redirect(
      new URL(`/?qb_error=${encodeURIComponent(error)}`, request.url),
    );
  }

  if (!searchParams.get('code') || !state) {
    return NextResponse.redirect(
      new URL('/?qb_error=missing_code_or_state', request.url),
    );
  }

  const locationId = state;

  try {
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { name: true },
    });
    if (!location) {
      return NextResponse.redirect(new URL('/?qb_error=location_not_found', request.url));
    }

    const oauth = getQuickBooksOAuthClient();
    const authResponse = await oauth.createToken(request.url);
    const token = authResponse.getJson();
    const qbRealmId = token.realmId ?? realmIdParam ?? '';
    const expiresAt = new Date(Date.now() + (token.expires_in || 3600) * 1000);
    const refreshExpiresAt =
      token.x_refresh_token_expires_in != null
        ? new Date(Date.now() + token.x_refresh_token_expires_in * 1000)
        : null;

    const realm = await prisma.realm.upsert({
      where: { realmId: qbRealmId },
      create: {
        realmId: qbRealmId,
        name: location.name,
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt,
        refreshExpiresAt,
      },
      update: {
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt,
        refreshExpiresAt,
      },
    });

    await prisma.location.update({
      where: { id: locationId },
      data: { realmId: realm.id },
    });

    return NextResponse.redirect(
      new URL(`/budget/location/${locationId}`, request.url),
    );
  } catch (e) {
    const err =
      e instanceof AppError
        ? e
        : new AppError(
            e instanceof Error ? e.message : 'QuickBooks callback failed',
            QB_CALLBACK_ERROR_CODE,
            { locationId },
          );
    console.error(`QuickBooks callback error [${err.code ?? QB_CALLBACK_ERROR_CODE}]:`, err.message, e);
    return NextResponse.redirect(new URL('/?qb_error=callback', request.url));
  }
}
