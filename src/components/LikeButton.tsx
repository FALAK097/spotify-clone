'use client';

import { useEffect, useState } from 'react';
import { AiOutlineHeart, AiFillHeart } from 'react-icons/ai';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { useUser } from '@/hooks/useUser';
import useAuthModal from '@/hooks/useAuthModal';

interface LikeButtonProps {
  songId: string;
}

const LikeButton: React.FC<LikeButtonProps> = ({ songId }) => {
  const router = useRouter();
  const authModal = useAuthModal();
  const { user } = useUser();

  const [isLiked, setIsLiked] = useState<boolean>(false);

  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/liked-songs/toggle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ songId }),
        });
        const data = await res.json();
        setIsLiked(data.liked);
      } catch {
        // silent
      }
    };

    fetchData();
  }, [songId, user?.id]);

  const Icon = isLiked ? AiFillHeart : AiOutlineHeart;

  const handleLike = async () => {
    if (!user) return authModal.onOpen();

    try {
      const res = await fetch('/api/liked-songs/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId }),
      });
      const data = await res.json();
      setIsLiked(data.liked);
      if (data.liked) toast.success('Liked!');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    }
  };

  return (
    <button
      className="
        cursor-pointer 
        hover:opacity-75 
        transition
      "
      onClick={handleLike}>
      <Icon color={isLiked ? '#22c55e' : 'white'} size={25} />
    </button>
  );
};

export default LikeButton;
