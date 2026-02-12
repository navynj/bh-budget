// GET /api/budget/[locationId]/[categoryId] — deprecated.
// Category list and amounts are now derived from QuickBooks COS on each page load (no DB table).

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      error:
        'Category data is no longer stored; use COS for the location and month instead.',
    },
    { status: 410 },
  );
}
