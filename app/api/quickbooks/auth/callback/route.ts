/**
 * GET /api/quickbooks/auth/callback?code=...&realmId=...&state=locationId
 * Exchanges authorization code for tokens and updates Location. Redirects to /budget/location/[locationId].
 */
import { AppError } from '@/lib/core/errors';
import { prisma } from '@/lib/core/prisma';
import { getQuickBooksOAuthClient } from '@/lib/quickbooks';
import { NextRequest, NextResponse } from 'next/server';

const QB_CALLBACK_ERROR_CODE = 'QB_CALLBACK_ERROR';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const realmId = searchParams.get('realmId');
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

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/?qb_error=missing_code_or_state', request.url),
    );
  }

  const locationId = state;

  try {
    const oauth = getQuickBooksOAuthClient();
    const authResponse = await oauth.createToken(request.url);
    const token = authResponse.getJson();
    const expiresAt = new Date(Date.now() + (token.expires_in || 3600) * 1000);

    await prisma.location.update({
      where: { id: locationId },
      data: {
        realmId: token.realmId ?? realmId ?? undefined,
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt,
      },
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
