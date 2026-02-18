import { parseBody, onboardingPostSchema } from '@/lib/api/schemas';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/core/prisma';
import { UserStatus } from '@prisma/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = await parseBody(request, onboardingPostSchema);
  if ('error' in parsed) return parsed.error;
  const { name, role, locationId } = parsed.data;

  if (role === 'manager' && locationId) {
    const location = await prisma.location.findUnique({
      where: { id: locationId },
    });
    if (!location) {
      return NextResponse.json({ error: 'Invalid location' }, { status: 400 });
    }
  }

  // Admin is active immediately; office and manager need approval
  const status: UserStatus =
    role === "admin" ? "active" : "pending_approval";

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name,
      role,
      status,
      locationId: role === 'manager' ? locationId ?? null : null,
    },
  });

  return NextResponse.json({ ok: true });
}
