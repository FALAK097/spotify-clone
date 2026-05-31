import { PutObjectCommand } from '@aws-sdk/client-s3';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { r2, R2_BUCKET } from '@/lib/r2';
import { rateLimit } from '@/lib/rate-limit';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
