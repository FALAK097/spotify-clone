import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import type { SongRow } from './getSongs';

const getSongsByUserId = async (): Promise<SongRow[]> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return [];

  const songs = await prisma.song.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  });

  return songs.map(s => ({
    id: s.id,
    user_id: s.userId ?? '',
    author: s.author ?? '',
    title: s.title ?? '',
    song_path: s.songPath ?? '',
    image_path: s.imagePath ?? '',
  }));
};

export default getSongsByUserId;
