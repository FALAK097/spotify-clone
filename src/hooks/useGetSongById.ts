import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import type { Song } from '@/types';

const useSongById = (id?: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const [song, setSong] = useState<Song | undefined>(undefined);

  useEffect(() => {
    if (!id) return;

    setIsLoading(true);

    const fetchSong = async () => {
      try {
        const res = await fetch(`/api/songs/${id}`);
        if (!res.ok) {
          setSong(undefined);
          return;
        }
        const data = await res.json();
        setSong(data as Song);
      } catch {
        toast.error('Failed to load song');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSong();
  }, [id]);

  return useMemo(
    () => ({ isLoading, song }),
    [isLoading, song]
  );
};

export default useSongById;
