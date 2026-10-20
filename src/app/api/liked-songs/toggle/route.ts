import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { songId } = await req.json();
  const existing = await prisma.likedSong.findUnique({
    where: { userId_songId: { userId: session.user.id, songId } },
  });

  if (existing) {
    await prisma.likedSong.delete({ where: { userId_songId: { userId: session.user.id, songId } } });
    return NextResponse.json({ liked: false });
  }

  await prisma.likedSong.create({
    data: { userId: session.user.id, songId },
  });
  return NextResponse.json({ liked: true });
}
