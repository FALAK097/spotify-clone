# Migration Plan: Next.js 13 + Supabase → Next.js 16 + Prisma + Better Auth + shadcn/ui

## Overview

**Current Stack:**
- Next.js 13.4.16 (App Router) + React 18
- Supabase (Auth, Database, Storage)
- npm
- Root-level file structure
- @radix-ui/react-* (hand-rolled wrappers)
- Zustand for state
- Stripe for payments

**Target Stack:**
- Next.js 16 (latest) + React 19
- Prisma (ORM) + PostgreSQL (local dev) + Neon (prod)
- Better Auth (authentication) + `@better-auth/stripe` plugin
- Cloudflare R2 (object storage via wrangler CLI + S3 SDK)
- pnpm
- `src/` directory structure
- shadcn/ui component library
- Zustand (keep) + Stripe (keep)

---

## Phase 0: Preparation & Scaffolding

### 0.1 — Install pnpm globally & set up lockfile
```bash
npm install -g pnpm
pnpm install
pnpm import  # generate pnpm-lock.yaml from package-lock.json
```

### 0.2 — Create `.gitignore`
Create `.gitignore` with:
```
node_modules/
.next/
*.local
.env
.env.local
.env.production
.env*.local
prisma/migrations/
```

### 0.3 — Create `.env` files
**`.env.example`** (template for contributors):
```env
# Better Auth
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/spotify_clone

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Cloudflare R2
CLOUDFLARE_R2_BUCKET=spotify-clone-uploads
CLOUDFLARE_R2_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_PUBLIC_URL=https://pub-<hash>.r2.dev
```

**`.env.local`** (local dev credentials — never commit).

### 0.4 — Clean up dependencies
Move misplaced deps to `devDependencies`:
- `@types/node`, `@types/react`, `@types/react-dom`
- `autoprefixer`, `postcss`, `tailwindcss`
- `eslint`, `eslint-config-next`
- `typescript`

Remove unused packages:
- `supabase` (CLI) → no longer needed
- `encoding` → unused
- `uniqid` + `@types/uniqid` → replace with `crypto.randomUUID()`
- `query-string` → simple `URLSearchParams` or remove

Remove all Supabase packages:
- `@supabase/auth-helpers-nextjs`
- `@supabase/auth-helpers-react`
- `@supabase/auth-ui-react`
- `@supabase/auth-ui-shared`
- `@supabase/supabase-js`

---

## Phase 1: Project Restructuring (`src/` directory)

### 1.1 — Move all source into `src/`
Create `src/` directory and move:
```
src/
  actions/          # Server actions (unchanged logic, new DB client)
  app/              # Next.js App Router
  components/       # UI components (migrate to shadcn/ui where applicable)
  hooks/            # React hooks
  lib/              # Utilities (stripe, helpers, auth, prisma)
  providers/        # Context providers
  types/            # Shared types
```

### 1.2 — Update `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "es2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": [
    "next-env.d.ts",
    "src/**/*.ts",
    "src/**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

### 1.3 — Update `next.config.js`
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
    ],
  },
};
module.exports = nextConfig;
```

### 1.4 — Update `tailwind.config.ts`
Use `src/` paths:
```ts
import type { Config } from 'tailwindcss';
const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: { extend: {} },
  plugins: [],
};
export default config;
```

### 1.5 — Update all imports
All `@/` imports will now resolve from `src/` instead of root.

---

## Phase 2: Database Layer (Prisma)

### 2.1 — Install Prisma
```bash
pnpm add -D prisma
pnpm add @prisma/client
pnpm prisma init
```

### 2.2 — Create Prisma schema
Based on the existing Supabase schema (`types_db.ts`), create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum PricingPlanInterval {
  day
  week
  month
  year
}

enum PricingType {
  one_time
  recurring
}

enum SubscriptionStatus {
  trialing
  active
  canceled
  incomplete
  incomplete_expired
  past_due
  unpaid
}

model Song {
  id        Int      @id @default(autoincrement())
  title     String?
  author    String?
  songPath  String?
  imagePath String?
  createdAt DateTime @default(now())
  userId    String?

  likedSongs LikedSong[]
}

model LikedSong {
  userId    String
  songId    Int
  createdAt DateTime @default(now())

  song Song @relation(fields: [songId], references: [id])

  @@id([userId, songId])
}

model Customer {
  id               String  @id
  stripeCustomerId String?

  // user relation handled by Better Auth user id
}

model Product {
  id          String   @id
  active      Boolean?
  name        String?
  description String?
  image       String?
  metadata    Json?

  prices Price[]
}

model Price {
  id              String               @id
  productId       String?
  active          Boolean?
  description     String?
  unitAmount      Int?
  currency        String?
  type            PricingType?
  interval        PricingPlanInterval?
  intervalCount   Int?
  trialPeriodDays Int?
  metadata        Json?

  product       Product?       @relation(fields: [productId], references: [id])
  subscriptions Subscription[]
}

model Subscription {
  id                 String             @id
  userId             String
  status             SubscriptionStatus?
  metadata           Json?
  priceId            String?
  quantity           Int?
  cancelAtPeriodEnd  Boolean?
  created            DateTime?
  currentPeriodStart DateTime?
  currentPeriodEnd   DateTime?
  endedAt            DateTime?
  cancelAt           DateTime?
  canceledAt         DateTime?
  trialStart         DateTime?
  trialEnd           DateTime?

  price Price? @relation(fields: [priceId], references: [id])
}
```

**Note on User model:** Better Auth manages its own `user`, `session`, `account`, and `verification` tables via the Prisma adapter. The `userId` fields in `Song`, `LikedSong`, `Customer`, and `Subscription` reference Better Auth's `user.id`. App-specific user fields (billing_address, payment_method, full_name) can be stored in a separate `UserProfile` model or added via Better Auth's profile plugin.

**Recommendation:** Create a `UserProfile` model for app fields:
```prisma
model UserProfile {
  id            String @id   // same as Better Auth user.id
  fullName      String?
  avatarUrl     String?
  billingAddress Json?
  paymentMethod  Json?
}
```

### 2.3 — Create `src/lib/prisma.ts`
```ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
```

### 2.4 — Run initial migration
```bash
pnpm prisma migrate dev --name init
```

---

## Phase 3: Auth Migration (Better Auth)

### 3.1 — Install better-auth
```bash
pnpm add better-auth
```

### 3.2 — Create `src/lib/auth.ts`
```ts
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import prisma from '@/lib/prisma';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
});
```

### 3.3 — Generate Better Auth tables
```bash
npx auth@latest generate
pnpm prisma migrate dev --name add_better_auth
```

### 3.4 — Mount Better Auth handler
Create `src/app/api/auth/[...all]/route.ts`:
```ts
import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

export const { POST, GET } = toNextJsHandler(auth);
```

### 3.5 — Create `src/lib/auth-client.ts`
```ts
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000',
});

export const { signIn, signUp, signOut, useSession } = authClient;
```

### 3.6 — Update `middleware.ts`
Replace Supabase middleware with Better Auth middleware:
```ts
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  // Better Auth handles session cookie refresh automatically
  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

Better Auth uses standard cookie-based sessions; the middleware from `@supabase/auth-helpers-nextjs` is no longer needed.

### 3.7 — Replace `SupabaseProvider` with `AuthProvider`
Create `src/providers/AuthProvider.tsx`:
```tsx
'use client';

import { useSession } from '@/lib/auth-client';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // useSession is already a hook from better-auth/react
  // We wrap it here for consistency, but children can use useSession directly
  return <>{children}</>;
}
```

### 3.8 — Rewrite `useUser.tsx`
Replace supabase user context with Better Auth session + API call:
```tsx
'use client';

import { useSession } from '@/lib/auth-client';
import { createContext, useContext, useEffect, useState } from 'react';
import type { Subscription, UserDetails } from '@/types';

type UserContextType = {
  user: any | null;
  userDetails: UserDetails | null;
  isLoading: boolean;
  subscription: Subscription | null;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  return context;
}

export function MyUserContextProvider(props: any) {
  const { data: session, isPending } = useSession();
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    if (session?.user && !isPending) {
      fetch('/api/user/details')
        .then(res => res.json())
        .then(data => {
          setUserDetails(data.userDetails);
          setSubscription(data.subscription);
        });
    }
  }, [session, isPending]);

  return (
    <UserContext.Provider
      value={{
        user: session?.user ?? null,
        userDetails,
        isLoading: isPending,
        subscription,
      }}
      {...props}
    />
  );
}
```

---

## Phase 4: Data Access Layer (Actions → Prisma)

### 4.1 — Create API route for user details
`src/app/api/user/details/route.ts`:
```ts
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function GET() {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session?.user) return NextResponse.json({});

  const [userDetails, subscription] = await Promise.all([
    prisma.userProfile.findUnique({ where: { id: session.user.id } }),
    prisma.subscription.findFirst({
      where: { userId: session.user.id, status: { in: ['trialing', 'active'] } },
      include: { price: { include: { product: true } } },
    }),
  ]);

  return NextResponse.json({ userDetails, subscription });
}
```

### 4.2 — Migrate each action file

**`src/actions/getSongs.ts`**
```ts
import prisma from '@/lib/prisma';
import type { Song } from '@/types';

const getSongs = async (): Promise<Song[]> => {
  const songs = await prisma.song.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return songs as Song[];
};

export default getSongs;
```

**`src/actions/getSongsByUserId.ts`**
```ts
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import type { Song } from '@/types';

const getSongsByUserId = async (): Promise<Song[]> => {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session?.user) return [];

  const songs = await prisma.song.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  });
  return songs as Song[];
};

export default getSongsByUserId;
```

**`src/actions/getSongsByTitle.ts`**
```ts
import prisma from '@/lib/prisma';
import type { Song } from '@/types';
import getSongs from './getSongs';

const getSongsByTitle = async (title: string): Promise<Song[]> => {
  if (!title) return getSongs();

  const songs = await prisma.song.findMany({
    where: { title: { contains: title, mode: 'insensitive' } },
    orderBy: { createdAt: 'desc' },
  });
  return songs as Song[];
};

export default getSongsByTitle;
```

**`src/actions/getSongById.ts`**
```ts
import prisma from '@/lib/prisma';
import type { Song } from '@/types';

const getSongById = async (id: string): Promise<Song | null> => {
  const song = await prisma.song.findUnique({
    where: { id: parseInt(id) },
  });
  return song as Song | null;
};

export default getSongById;
```

**`src/actions/getLikedSongs.ts`**
```ts
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import type { Song } from '@/types';

const getLikedSongs = async (): Promise<Song[]> => {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session?.user) return [];

  const likedSongs = await prisma.likedSong.findMany({
    where: { userId: session.user.id },
    include: { song: true },
    orderBy: { createdAt: 'desc' },
  });

  return likedSongs.map(item => item.song) as Song[];
};

export default getLikedSongs;
```

**`src/actions/getActiveProductsWithPrices.ts`**
```ts
import prisma from '@/lib/prisma';
import type { ProductWithPrice } from '@/types';

const getActiveProductsWithPrices = async (): Promise<ProductWithPrice[]> => {
  const products = await prisma.product.findMany({
    where: { active: true },
    include: {
      prices: {
        where: { active: true },
        orderBy: { unitAmount: 'asc' },
      },
    },
  });
  return products as unknown as ProductWithPrice[];
};

export default getActiveProductsWithPrices;
```

---

## Phase 5: Migrate Components Using Supabase

### 5.1 — `src/components/AuthModal.tsx`
Replace Supabase Auth UI with Better Auth sign-in form + shadcn/ui Dialog:

```tsx
'use client';

import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import useAuthModal from '@/hooks/useAuthModal';

const AuthModal = () => {
  const { isOpen, onClose } = useAuthModal();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authClient.signIn.email({ email, password });
      toast.success('Signed in');
      router.refresh();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Welcome back</DialogTitle>
          <DialogDescription>Login to your account.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button type="button" variant="outline" className="w-full" onClick={() => authClient.signIn.social({ provider: 'google' })}>
            Continue with Google
          </Button>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Loading...' : 'Sign In'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
```

### 5.2 — `src/components/Header.tsx`
Replace `useSupabaseClient().auth.signOut()` with `authClient.signOut()`:
```tsx
import { authClient } from '@/lib/auth-client';

const handleLogout = async () => {
  await authClient.signOut();
  player.reset();
  router.refresh();
};
```

Remove the `useSupabaseClient` import entirely.

### 5.3 — `src/components/LikeButton.tsx`
Replace supabase client calls with API fetch:
```tsx
const handleLike = async () => {
  if (!user) return authModal.onOpen();
  const res = await fetch('/api/liked-songs/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ songId }),
  });
  const data = await res.json();
  setIsLiked(data.liked);
  if (data.liked) toast.success('Liked!');
  router.refresh();
};
```

Create `src/app/api/liked-songs/toggle/route.ts`:
```ts
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { songId } = await req.json();
  const existing = await prisma.likedSong.findUnique({
    where: { userId_songId: { userId: session.user.id, songId: parseInt(songId) } },
  });

  if (existing) {
    await prisma.likedSong.delete({ where: { userId_songId: { userId: session.user.id, songId: parseInt(songId) } } });
    return NextResponse.json({ liked: false });
  }

  await prisma.likedSong.create({ data: { userId: session.user.id, songId: parseInt(songId) } });
  return NextResponse.json({ liked: true });
}
```

### 5.4 — `src/components/UploadModal.tsx`
Replace Supabase Storage with Cloudflare R2 (S3-compatible API) + local FS for dev.

### 5.4a — Rate limiting for uploads (anti-abuse)
Create `src/lib/rate-limit.ts` — simple per-user token bucket:
```ts
const rateMap = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}
```

Usage in the upload handler — limit to 10 uploads per user per hour.

Create `src/lib/r2.ts` — R2 client singleton:
```ts
import { S3Client } from '@aws-sdk/client-s3';

export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

export const R2_BUCKET = process.env.CLOUDFLARE_R2_BUCKET || 'spotify-clone-uploads';
```

Upload handler `src/app/api/songs/upload/route.ts`:
```ts
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { r2, R2_BUCKET } from '@/lib/r2';
import { rateLimit } from '@/lib/rate-limit';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit: 10 uploads per hour per user
  if (!rateLimit(`upload:${session.user.id}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many uploads. Try again later.' }, { status: 429 });
  }

  const formData = await req.formData();
  const songFile = formData.get('song') as File;
  const imageFile = formData.get('image') as File;
  const title = formData.get('title') as string;
  const author = formData.get('author') as string;

  if (!songFile || !imageFile || !title || !author) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  // File size validation: 10MB max for songs, 5MB for images
  const MAX_SONG_SIZE = 10 * 1024 * 1024;
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
  if (songFile.size > MAX_SONG_SIZE) {
    return NextResponse.json({ error: 'Song file too large (max 10MB)' }, { status: 400 });
  }
  if (imageFile.size > MAX_IMAGE_SIZE) {
    return NextResponse.json({ error: 'Image file too large (max 5MB)' }, { status: 400 });
  }

  if (process.env.NODE_ENV === 'development') {
    const fs = require('fs');
    const path = require('path');
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(path.join(uploadDir, 'songs'), { recursive: true });
      fs.mkdirSync(path.join(uploadDir, 'images'), { recursive: true });
    }
    const id = randomUUID();
    const songFileName = `${id}-${songFile.name}`;
    const imageFileName = `${id}-${imageFile.name}`;
    fs.writeFileSync(path.join(uploadDir, 'songs', songFileName), Buffer.from(await songFile.arrayBuffer()));
    fs.writeFileSync(path.join(uploadDir, 'images', imageFileName), Buffer.from(await imageFile.arrayBuffer()));
    await prisma.song.create({
      data: { title, author, songPath: `/uploads/songs/${songFileName}`, imagePath: `/uploads/images/${imageFileName}`, userId: session.user.id },
    });
    return NextResponse.json({ success: true });
  }

  const id = randomUUID();
  const songKey = `songs/${id}-${songFile.name}`;
  const imageKey = `images/${id}-${imageFile.name}`;

  await Promise.all([
    r2.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: songKey, Body: Buffer.from(await songFile.arrayBuffer()), ContentType: songFile.type })),
    r2.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: imageKey, Body: Buffer.from(await imageFile.arrayBuffer()), ContentType: imageFile.type })),
  ]);

  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;

  await prisma.song.create({
    data: { title, author, songPath: `${publicUrl}/${songKey}`, imagePath: `${publicUrl}/${imageKey}`, userId: session.user.id },
  });

  return NextResponse.json({ success: true });
}
```

Update `UploadModal.tsx`:
```tsx
const onSubmit: SubmitHandler<FieldValues> = async (values) => {
  try {
    setIsLoading(true);
    const imageFile = values.image?.[0];
    const songFile = values.song?.[0];
    if (!imageFile || !songFile || !user) {
      toast.error('Missing fields');
      return;
    }

    const formData = new FormData();
    formData.append('song', songFile);
    formData.append('image', imageFile);
    formData.append('title', values.title);
    formData.append('author', values.author);

    const res = await fetch('/api/songs/upload', { method: 'POST', body: formData });
    if (!res.ok) return toast.error('Upload failed');

    router.refresh();
    toast.success('Song created!');
    reset();
    uploadModal.onClose();
  } catch {
    toast.error('Something went wrong');
  } finally {
    setIsLoading(false);
  }
};
```

### 5.5 — Update `useLoadImage.ts` & `useLoadSongUrl.ts`
```ts
const useLoadImage = (song: Song) => {
  if (!song) return null;
  return song.imagePath ?? null;
};

export default useLoadImage;
```

```ts
const useLoadSongUrl = (song: Song) => {
  if (!song) return '';
  return song.songPath ?? '';
};

export default useLoadSongUrl;
```

### 5.6 — Update `useGetSongById.ts`
```tsx
import { useEffect, useMemo, useState } from 'react';
import type { Song } from '@/types';

const useSongById = (id?: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const [song, setSong] = useState<Song | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    fetch(`/api/songs/${id}`)
      .then(res => res.json())
      .then(data => { setSong(data); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, [id]);

  return useMemo(() => ({ isLoading, song }), [isLoading, song]);
};

export default useSongById;
```

Create `src/app/api/songs/[id]/route.ts`:
```ts
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const song = await prisma.song.findUnique({ where: { id: parseInt(params.id) } });
  return NextResponse.json(song);
}
```

---

## Phase 6: Stripe Integration (Better Auth Stripe Plugin)

### 6.1 — Install the Stripe plugin & SDK
```bash
pnpm add @better-auth/stripe stripe@^22.0.0
```

### 6.2 — Update `src/lib/auth.ts` with Stripe plugin
```ts
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { stripe } from '@better-auth/stripe';
import Stripe from 'stripe';
import prisma from '@/lib/prisma';

const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
});

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: { enabled: true },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  plugins: [
    stripe({
      stripeClient,
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
      createCustomerOnSignUp: true,
      subscription: {
        enabled: true,
        plans: [
          {
            name: 'basic',
            priceId: 'price_xxx',       // Replace with your Stripe price ID
            annualDiscountPriceId: 'price_yyy',
            freeTrial: { days: 7 },
          },
          {
            name: 'pro',
            priceId: 'price_zzz',
            annualDiscountPriceId: 'price_aaa',
            freeTrial: { days: 7 },
          },
        ],
      },
    }),
  ],
});
```

### 6.3 — Update `src/lib/auth-client.ts` with Stripe client plugin
```ts
import { createAuthClient } from 'better-auth/react';
import { stripeClient } from '@better-auth/stripe/client';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000',
  plugins: [
    stripeClient({ subscription: true }),
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
```

### 6.4 — Migrate database for Stripe plugin tables
```bash
npx auth@latest generate
pnpm prisma migrate dev --name add_stripe_plugin
```

### 6.5 — Update SubscribeModal to use the plugin
The plugin provides `authClient.subscription.upgrade()` and `authClient.subscription.billingPortal()` methods, so no custom API routes are needed for checkout/portal.

`src/components/SubscribeModal.tsx` — replace Stripe checkout flow:
```tsx
const handleCheckout = async (plan: string) => {
  await authClient.subscription.upgrade({
    plan,
    successUrl: `${window.location.origin}/account`,
    cancelUrl: `${window.location.origin}/`,
    disableRedirect: false,
  });
};
```

`src/app/account/components/AccountContent.tsx` — replace portal link:
```tsx
const handlePortal = async () => {
  const { data } = await authClient.subscription.billingPortal({
    returnUrl: `${window.location.origin}/account`,
  });
  if (data?.url) window.location.assign(data.url);
};
```

### 6.6 — Delete obsolete Stripe API routes & helpers
Delete these files (replaced by the plugin's built-in endpoints):
- `src/app/api/create-checkout-session/route.ts` (plugin handles at `/api/auth/stripe/*`)
- `src/app/api/create-portal-link/route.ts` (plugin handles at `/api/auth/stripe/*`)
- `src/app/api/webhooks/route.ts` (plugin handles at `/api/auth/stripe/webhook`)
- `src/lib/stripe-admin.ts` (no longer needed — plugin manages customers/subscriptions)
- `src/lib/helpers.ts` can remove `postData` (no longer needed for Stripe)

### 6.7 — Stripe webhook setup
In Stripe Dashboard, create webhook pointing to:
```
https://your-domain.com/api/auth/stripe/webhook
```
Subscribe to events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.

### 6.8 — Fetch subscriptions via plugin
`src/app/api/user/details/route.ts` — fetch subscription from plugin:
```ts
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session?.user) return NextResponse.json({});

  const userDetails = await prisma.userProfile.findUnique({ where: { id: session.user.id } });

  // Use the plugin's API to get active subscription
  const subscriptions = await auth.api.listActiveSubscriptions({
    query: { referenceId: session.user.id },
    headers: await headers(),
  });

  return NextResponse.json({ userDetails, subscription: subscriptions?.[0] ?? null });
}
```

### 6.9 — Keep the `Product` + `Price` models in Prisma
Products and prices are still used for rendering the pricing UI. The Stripe webhook `product.created` / `price.created` events can be handled via the plugin's `onEvent` callback to keep Prisma in sync:
```ts
stripe({
  onEvent: async (event) => {
    switch (event.type) {
      case 'product.created':
      case 'product.updated':
        // upsert product in Prisma
        break;
      case 'price.created':
      case 'price.updated':
        // upsert price in Prisma
        break;
    }
  },
});
```

---

## Phase 7: shadcn/ui Integration

### 7.1 — Initialize shadcn/ui
```bash
pnpm dlx shadcn@latest init -d
```
This configures `components.json` with default settings. Then add components:
```bash
pnpm dlx shadcn@latest add button dialog input card slider sonner separator avatar
```

### 7.2 — Replace custom components with shadcn/ui

| Custom Component | shadcn/ui Replacement | Action |
|---|---|---|
| `Button.tsx` | `@/components/ui/button` | Replace usage, keep only if customizations needed |
| `Input.tsx` | `@/components/ui/input` | Replace usage |
| `Modal.tsx` | `@/components/ui/dialog` | Replace usage |
| `Slider.tsx` | `@/components/ui/slider` | Replace usage |
| `ToasterProvider.tsx` | `sonner` + `Toaster` | Rewrite |
| `Box.tsx` | none (keep) | App-specific layout |
| `Sidebar.tsx` | none (keep) | App-specific layout |
| `SidebarItem.tsx` | none (keep) | App-specific |
| `Library.tsx` | none (keep) | App-specific |
| `MediaItem.tsx` | none (keep) | App-specific |
| `SongItem.tsx` | none (keep) | App-specific |
| `PlayButton.tsx` | none (keep) | App-specific |
| `ListItem.tsx` | none (keep) | App-specific |
| `SearchInput.tsx` | none (keep) | App-specific |
| `Player.tsx` | none (keep) | App-specific |
| `PlayerContent.tsx` | none (keep) | App-specific |

### 7.3 — Replace `react-hot-toast` with `sonner`
```tsx
// providers/ToasterProvider.tsx
'use client';
import { Toaster } from 'sonner';

const ToasterProvider = () => <Toaster position="bottom-center" richColors />;
export default ToasterProvider;
```

Replace all `import { toast } from 'react-hot-toast'` with `import { toast } from 'sonner'`.

---

## Phase 8: Layout & Provider Updates

### 8.1 — Update `src/app/layout.tsx`
```tsx
import { Figtree } from 'next/font/google';
import getSongsByUserId from '@/actions/getSongsByUserId';
import getActiveProductsWithPrices from '@/actions/getActiveProductsWithPrices';
import Sidebar from '@/components/Sidebar';
import ToasterProvider from '@/providers/ToasterProvider';
import UserProvider from '@/providers/UserProvider';
import ModalProvider from '@/providers/ModalProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import Player from '@/components/Player';
import './globals.css';

const font = Figtree({ subsets: ['latin'] });

export const metadata = {
  title: 'Spotify Clone',
  description: 'Spotify Clone',
};

export const revalidate = 0;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const products = await getActiveProductsWithPrices();
  const userSongs = await getSongsByUserId();

  return (
    <html lang="en">
      <body className={font.className}>
        <ToasterProvider />
        <AuthProvider>
          <UserProvider>
            <ModalProvider products={products} />
            <Sidebar songs={userSongs}>{children}</Sidebar>
            <Player />
          </UserProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
```

---

## Phase 9: Cleanup & Package Reorganization

### 9.1 — Final `package.json`
```json
{
  "name": "spotify-clone",
  "version": "0.2.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "postinstall": "prisma generate"
  },
  "dependencies": {
    "@prisma/client": "^6.x",
    "@radix-ui/react-slider": "^1.1.2",
    "@stripe/stripe-js": "^2.1.0",
    "@vercel/blob": "^1.x",
    "better-auth": "^1.x",
    "class-variance-authority": "^0.7.x",
    "clsx": "^2.x",
    "lucide-react": "^0.x",
    "next": "^16.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-hook-form": "^7.45.4",
    "react-icons": "^4.10.1",
    "sonner": "^1.x",
    "stripe": "^16.x",
    "tailwind-merge": "^1.14.0",
    "tailwindcss-animate": "^1.x",
    "use-sound": "^4.0.1",
    "zustand": "^4.4.1"
  },
  "devDependencies": {
    "@types/node": "^20.x",
    "@types/react": "^19.x",
    "@types/react-dom": "^19.x",
    "autoprefixer": "^10.4.x",
    "eslint": "^8.x",
    "eslint-config-next": "^16.0.0",
    "postcss": "^8.4.x",
    "prisma": "^6.x",
    "tailwindcss": "^3.4.x",
    "typescript": "^5.x"
  }
}
```

### 9.2 — Delete obsolete files
- `libs/` (entire directory — replaced by `src/lib/`)
- `providers/SupabaseProvider.tsx`
- `types_db.ts`
- `package-lock.json` (replaced by `pnpm-lock.yaml`)

### 9.3 — Final `src/lib/` structure
```
src/lib/
  auth.ts           # Better Auth server instance
  auth-client.ts    # Better Auth client (createAuthClient)
  prisma.ts         # Prisma client singleton
  stripe.ts         # Stripe server instance (kept)
  stripe-client.ts  # Stripe client loadStripe (kept)
  helpers.ts        # getURL, postData, toDateTime (kept)
  stripe-admin.ts   # Stripe webhook helpers (replaced supabaseAdmin)
```

---

## Phase 10: Production Deployment (Vercel + Neon)

### 10.1 — `vercel.json`
```json
{
  "framework": "nextjs",
  "buildCommand": "pnpm build",
  "installCommand": "pnpm install"
}
```

### 10.2 — Neon Database Setup
1. Create project at [neon.tech](https://neon.tech)
2. Copy pooled connection string as `DATABASE_URL`
3. Set environment variable in Vercel dashboard

### 10.3 — Vercel Environment Variables
```
BETTER_AUTH_SECRET=<generated with openssl rand -base64 32>
BETTER_AUTH_URL=https://your-domain.vercel.app
DATABASE_URL=postgresql://...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### 10.4 — Deploy
```bash
pnpm run build
# Push to git → Vercel auto-deploys
# Or: vercel --prod
```

### 10.5 — Post-deploy
- Run `pnpm prisma migrate deploy` (can be added to Vercel build step)
- Update Stripe webhook endpoint URL to `https://your-domain.vercel.app/api/webhooks`
- Test auth flow (email/password + GitHub OAuth)
- Test song upload
- Test Stripe checkout

---

## Migration Order (Recommended)

| Step | What | Risk |
|---|---|---|
| 0 | pnpm setup, .gitignore, .env.example | Low |
| 1 | Restructure to `src/`, update tsconfig/tailwind/next config | Medium |
| 2 | Install Prisma, create schema, run migration | Low |
| 3 | Install Better Auth, create auth instance + handler | Low |
| 4 | Create auth client, middleware, AuthProvider, useUser | Medium |
| 5 | Migrate actions (getSongs, etc.) → Prisma | Medium |
| 6 | Create API routes (user/details, liked-songs/toggle, songs/upload, songs/[id]) | Medium |
| 7 | Migrate components (AuthModal, Header, LikeButton, UploadModal) | Medium |
| 8 | Migrate Stripe webhook helpers → Prisma | Low |
| 9 | Install shadcn/ui, replace Button/Input/Modal/Toaster | Low |
| 10 | Remove all Supabase packages, delete obsolete files | Low |
| 11 | Build & test everything | High |
| 12 | Deploy to Vercel + Neon | Low |

---

## Key API Endpoints

| Route | Method | Purpose |
|---|---|---|
| `POST /api/auth/*` | ALL | Better Auth handler (catch-all) |
| `GET /api/user/details` | GET | Fetch user profile + subscription |
| `POST /api/liked-songs/toggle` | POST | Like/unlike a song |
| `GET /api/songs/[id]` | GET | Get song by ID |
| `POST /api/songs/upload` | POST | Upload song + image files |
| `POST /api/create-checkout-session` | POST | Stripe checkout session |
| `POST /api/create-portal-link` | POST | Stripe customer portal |
| `POST /api/webhooks` | POST | Stripe webhooks |

---

## Complete Supabase → Replacement Mapping

| Supabase Feature | Used In | Replacement |
|---|---|---|
| `supabase.auth.getSession()` | middleware.ts | Better Auth handles session automatically |
| `createServerComponentClient` | 6 action files | `auth.api.getSession({ headers })` + Prisma |
| `createRouteHandlerClient` | checkout-session, portal-link | `auth.api.getSession({ headers })` |
| `createClientComponentClient` | SupabaseProvider | Better Auth `useSession()` hook |
| `useSessionContext` | AuthModal, LikeButton, useGetSongById | Better Auth `useSession()` or fetch |
| `useSupabaseClient` | AuthModal, Header, UploadModal, useLoadImage, useLoadSongUrl | `authClient` or direct URL |
| `Auth` component (auth-ui-react) | AuthModal | Custom shadcn/ui Dialog + Better Auth forms |
| `supabase.from('songs').select(...)` | Action files | `prisma.song.findMany()` |
| `supabase.from('liked_songs').select(...)` | getLikedSongs, LikeButton | `prisma.likedSong.findMany()` |
| `supabase.storage.from('songs').upload()` | UploadModal | `@vercel/blob` / local filesystem |
| `supabase.storage.getPublicUrl()` | useLoadImage, useLoadSongUrl | `song.imagePath` / `song.songPath` |
| `supabaseAdmin` client | stripe-admin.ts | Prisma client |
| `supabase.from('products').upsert()` | stripe-admin.ts | `prisma.product.upsert()` |
| `supabase.from('customers')` | stripe-admin.ts | `prisma.customer` |
| `supabase.from('subscriptions').upsert()` | stripe-admin.ts | `prisma.subscription.upsert()` |
| `supabase.from('users')` (user_details) | useUser, stripe-admin.ts | `prisma.userProfile` |
| Supabase generated types (`types_db.ts`) | — | Prisma generated types (`@prisma/client`) |

---

## Commands Quick Reference

```bash
# Setup
pnpm install
pnpm import                              # convert package-lock → pnpm-lock

# Prisma
pnpm prisma generate                     # generate Prisma client
pnpm prisma db push                      # push schema to DB (no migration)
pnpm prisma migrate dev --name <name>    # create + apply migration
pnpm prisma migrate deploy               # apply migrations in prod
pnpm prisma studio                       # GUI DB browser

# Better Auth
npx auth@latest generate                 # generate Better Auth migration

# shadcn/ui
pnpm dlx shadcn@latest init              # init shadcn/ui
pnpm dlx shadcn@latest add button dialog # add components

# Dev
pnpm dev                                 # start dev server
pnpm build                               # build for production
pnpm lint                                # lint
```
