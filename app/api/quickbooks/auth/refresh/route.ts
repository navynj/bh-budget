/**
 * POST /api/quickbooks/auth/refresh
 * Refreshes QuickBooks tokens for a realm.
 * Body: { "realmId": "..." } or { "locationId": "..." }
 */
import { auth, getOfficeOrAdmin } from '@/lib/auth';
import { prisma } from '@/lib/core/prisma';
import { refreshQuickBooksTokens } from '@/lib/quickbooks';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { realmId?: string; locationId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const { realmId, locationId } = body;
  if (!realmId && !locationId) {
    return NextResponse.json(
      { error: 'Provide realmId or locationId in request body' },
      { status: 400 },
    );
  }

  const isOfficeOrAdmin = getOfficeOrAdmin(session.user.role);
  const managerLocationId = session.user.locationId ?? undefined;

  const realm = await prisma.realm.findFirst({
    where: realmId
      ? { id: realmId }
      : {
          locations: {
            some: {
              id: locationId,
              ...(isOfficeOrAdmin
                ? {}
                : { id: managerLocationId ?? 'none' }),
            },
          },
        },
    select: {
      id: true,
      refreshToken: true,
      refreshExpiresAt: true,
    },
  });

  if (!realm) {
    return NextResponse.json(
      { error: 'Realm not found or access denied' },
      { status: 404 },
    );
  }

  if (!realm.refreshToken) {
    return NextResponse.json(
      { error: 'No refresh token; connect QuickBooks first.' },
      { status: 400 },
    );
  }

  try {
    const data = await refreshQuickBooksTokens(realm.refreshToken);
    const expiresAt = new Date(
      Date.now() + (data.expires_in || 3600) * 1000,
    );

    await prisma.realm.update({
      where: { id: realm.id },
      data: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Tokens refreshed successfully',
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to refresh tokens';
    const isExpired =
      /refresh_token.*expired|invalid_grant|QB_REFRESH_EXPIRED/i.test(
        message,
      );
    console.error('QuickBooks refresh error:', message);
    return NextResponse.json(
      {
        error: isExpired
          ? 'Refresh token expired. Reconnect QuickBooks for this location.'
          : 'Failed to refresh access token',
      },
      { status: isExpired ? 401 : 500 },
    );
  }
}
