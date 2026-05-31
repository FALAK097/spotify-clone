'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

import { authClient } from '@/lib/auth-client';
import useAuthModal from '@/hooks/useAuthModal';
import { useSession } from '@/lib/auth-client';

import Modal from './Modal';
import Input from './Input';
import Button from './Button';

const AuthModal = () => {
  const router = useRouter();
  const { onClose, isOpen } = useAuthModal();
  const { data: session, isPending } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session && !isPending) {
      router.refresh();
      onClose();
    }
  }, [session, isPending, router, onClose]);

  const onChange = (open: boolean) => {
    if (!open) onClose();
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authClient.signIn.email({ email, password });
      toast.success('Signed in!');
      router.refresh();
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Welcome back"
      description="Login to your account."
      isOpen={isOpen}
      onChange={onChange}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-y-4">
        <Input
          id="email"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          id="password"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button
          type="button"
          className="bg-neutral-700 text-white px-6 py-2"
          onClick={() => authClient.signIn.social({ provider: 'google' })}
        >
          Continue with Google
        </Button>
        <Button disabled={loading} type="submit" className="bg-white px-6 py-2">
          {loading ? 'Loading...' : 'Sign In'}
        </Button>
      </form>
    </Modal>
  );
};

export default AuthModal;
