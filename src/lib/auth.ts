import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { stripe as stripePlugin } from '@better-auth/stripe';
import Stripe from 'stripe';
import prisma from '@/lib/prisma';

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: { enabled: true },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    },
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
