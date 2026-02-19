/**
 * GET /api/quickbooks/auth
 * - No locationId, no returnTo: returns { connections } for the logged-in user.
 * - No locationId, with returnTo: redirects to Intuit OAuth; callback will upsert Realm (create or update tokens) and redirect to returnTo.
 * - locationId (+ optional returnTo): redirects to Intuit OAuth; callback will upsert Realm and link Location, then redirect.
 */
import { auth, getOfficeOrAdmin } from '@/lib/auth';
import {
  getDefaultQuickBooksScopes,
  getQuickBooksOAuthClient,
} from '@/lib/quickbooks';
import { toApiErrorResponse } from '@/lib/core/errors';
import { prisma } from '@/lib/core/prisma';
import { NextRequest, NextResponse } from 'next/server';

const STATE_SEP = '\t';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const locationId = request.nextUrl.searchParams.get('locationId');
  const returnTo = request.nextUrl.searchParams.get('returnTo');

  if (!locationId) {
    if (returnTo && returnTo.length > 0) {
      try {
        const state = returnTo;
        const oauth = getQuickBooksOAuthClient();
        const authUrl = oauth.authorizeUri({
          scope: getDefaultQuickBooksScopes(),
          state,
        });
        return NextResponse.redirect(authUrl);
      } catch (e) {
        return toApiErrorResponse(e, 'QuickBooks auth redirect error:');
      }
    }

    const isOfficeOrAdmin = getOfficeOrAdmin(session.user.role);
    const managerLocationId = session.user.locationId ?? undefined;

    const locations = await prisma.location.findMany({
      where: isOfficeOrAdmin
        ? undefined
        : managerLocationId
          ? { id: managerLocationId }
          : { id: 'none' },
      select: {
        id: true,
        code: true,
        name: true,
        realmId: true,
        realm: {
          select: {
            id: true,
            realmId: true,
            refreshToken: true,
            refreshExpiresAt: true,
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    const connections = locations.map((loc) => ({
      locationId: loc.id,
      locationCode: loc.code,
      locationName: loc.name,
      realmId: loc.realm?.id ?? null,
      qbRealmId: loc.realm?.realmId ?? null,
      hasTokens: Boolean(loc.realm?.refreshToken),
      refreshExpiresAt: loc.realm?.refreshExpiresAt?.toISOString() ?? null,
    }));

    return NextResponse.json({ connections });
  }

  try {
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { id: true },
    });
    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 },
      );
    }

    const state =
      returnTo && returnTo.length > 0
        ? `${locationId}${STATE_SEP}${returnTo}`
        : locationId;

    const oauth = getQuickBooksOAuthClient();
    const authUrl = oauth.authorizeUri({
      scope: getDefaultQuickBooksScopes(),
      state,
    });
    return NextResponse.redirect(authUrl);
  } catch (e) {
    return toApiErrorResponse(e, 'QuickBooks auth redirect error:');
  }
}
