import type { Song } from '@/types';

const useLoadSongUrl = (song: Song) => {
  if (!song) return '';
  return song.song_path ?? '';
};

export default useLoadSongUrl;
