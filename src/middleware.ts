import { NextRequest, NextResponse } from 'next/server';

export async function middleware(_req: NextRequest) {
  const res = NextResponse.next();
  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
