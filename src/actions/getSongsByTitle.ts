import prisma from '@/lib/prisma';
import type { SongRow } from './getSongs';
import getSongs from './getSongs';

const getSongsByTitle = async (title: string): Promise<SongRow[]> => {
  if (!title) return getSongs();

  const songs = await prisma.song.findMany({
    where: { title: { contains: title, mode: 'insensitive' } },
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

export default getSongsByTitle;
