import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const song = await prisma.song.findUnique({ where: { id: params.id } });
  if (!song) return NextResponse.json(null, { status: 404 });

  return NextResponse.json({
    id: song.id,
    user_id: song.userId ?? '',
    author: song.author ?? '',
    title: song.title ?? '',
    song_path: song.songPath ?? '',
    image_path: song.imagePath ?? '',
  });
}
