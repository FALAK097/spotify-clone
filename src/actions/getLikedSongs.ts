import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import type { SongRow } from './getSongs';

const getLikedSongs = async (): Promise<SongRow[]> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return [];

  const likedSongs = await prisma.likedSong.findMany({
    where: { userId: session.user.id },
    include: { song: true },
    orderBy: { createdAt: 'desc' },
  });

  return likedSongs.map(item => ({
    id: item.song.id,
    user_id: item.song.userId ?? '',
    author: item.song.author ?? '',
    title: item.song.title ?? '',
    song_path: item.song.songPath ?? '',
    image_path: item.song.imagePath ?? '',
  }));
};

export default getLikedSongs;
