import prisma from '@/lib/prisma';
import type { SongRow } from './getSongs';

const getSongById = async (id: string): Promise<SongRow | null> => {
  const song = await prisma.song.findUnique({ where: { id } });
  if (!song) return null;

  return {
    id: song.id,
    user_id: song.userId ?? '',
    author: song.author ?? '',
    title: song.title ?? '',
    song_path: song.songPath ?? '',
    image_path: song.imagePath ?? '',
  };
};

export default getSongById;
