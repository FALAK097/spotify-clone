import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { stripe as stripePlugin } from '@better-auth/stripe';
import Stripe from 'stripe';
import prisma from '@/lib/prisma';

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL:
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://spotify.falakgala.dev',
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  plugins: process.env.STRIPE_SECRET_KEY
    ? [
        stripePlugin({
          stripeClient: new Stripe(process.env.STRIPE_SECRET_KEY),
          stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
          createCustomerOnSignUp: true,
          subscription: {
            enabled: true,
            plans: [],
          },
        }),
      ]
    : [],
});
