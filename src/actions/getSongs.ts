import prisma from '@/lib/prisma';

export interface SongRow {
  id: string;
  user_id: string;
  author: string;
  title: string;
  song_path: string;
  image_path: string;
}

const getSongs = async (): Promise<SongRow[]> => {
  try {
    const songs = await prisma.song.findMany({
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
  } catch (error) {
    console.error(error);
    return [];
  }
};

export default getSongs;
