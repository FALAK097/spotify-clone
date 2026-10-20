'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

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
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [name, setName] = useState('');
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
    if (!open) {
      onClose();
      // Reset form
      setName('');
      setEmail('');
      setPassword('');
      setMode('signIn');
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (mode === 'signUp' && !name) {
      toast.error('Please enter your name');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signUp') {
        const res = await authClient.signUp.email({
          email,
          password,
          name,
        });

        if (res?.error) {
          toast.error(res.error.message || 'Failed to create account');
          return;
        }

        toast.success('Account created successfully! Welcome to Spotify.');
      } else {
        const res = await authClient.signIn.email({
          email,
          password,
        });

        if (res?.error) {
          toast.error(res.error.message || 'Invalid email or password');
          return;
        }

        toast.success('Signed in successfully!');
      }

      router.refresh();
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode((prev) => (prev === 'signIn' ? 'signUp' : 'signIn'));
  };

  return (
    <Modal
      title={mode === 'signIn' ? 'Welcome back' : 'Create an account'}
      description={
        mode === 'signIn'
          ? 'Log in to continue listening.'
          : 'Sign up to start listening to your favorite tracks.'
      }
      isOpen={isOpen}
      onChange={onChange}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-y-4">
        {mode === 'signUp' && (
          <div>
            <label className="text-xs text-neutral-400 font-semibold mb-1 block">
              What should we call you?
            </label>
            <Input
              id="name"
              type="text"
              placeholder="Your name"
              value={name}
              required
              disabled={loading}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        )}

        <div>
          <label className="text-xs text-neutral-400 font-semibold mb-1 block">
            Email address
          </label>
          <Input
            id="email"
            type="email"
            placeholder="name@domain.com"
            value={email}
            required
            disabled={loading}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs text-neutral-400 font-semibold mb-1 block">
            Password
          </label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            required
            disabled={loading}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <Button
          disabled={loading}
          type="submit"
          className="bg-green-500 text-black py-3 mt-2 hover:scale-[1.02] transition font-bold"
        >
          {loading
            ? 'Please wait...'
            : mode === 'signIn'
            ? 'Sign In'
            : 'Create Account'}
        </Button>

        <div className="flex items-center justify-center pt-2">
          <button
            type="button"
            onClick={toggleMode}
            disabled={loading}
            className="text-xs text-neutral-400 hover:text-white transition underline cursor-pointer"
          >
            {mode === 'signIn'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AuthModal;
