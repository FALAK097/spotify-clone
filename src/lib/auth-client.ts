import { createAuthClient } from 'better-auth/react';
import { stripeClient } from '@better-auth/stripe/client';

export const authClient = createAuthClient({
  baseURL:
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'https://spotify.falakgala.dev',
  plugins: [
    stripeClient({ subscription: true }),
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
