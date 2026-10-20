import { createAuthClient } from 'better-auth/react';
import { stripeClient } from '@better-auth/stripe/client';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000',
  plugins: [
    stripeClient({ subscription: true }),
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
