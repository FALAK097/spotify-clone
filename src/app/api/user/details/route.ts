import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({});

  const userDetails = await prisma.userProfile.findUnique({
    where: { id: session.user.id },
  });

  const subscription = await prisma.subscription.findFirst({
    where: { referenceId: session.user.id, status: { in: ['trialing', 'active'] } },
  });

  return NextResponse.json({ userDetails, subscription });
}
