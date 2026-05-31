import type { Song } from '@/types';

const useLoadImage = (song: Song) => {
  if (!song) return null;
  return song.image_path ?? null;
};

export default useLoadImage;
