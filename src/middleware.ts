// Next.js middleware — runt bij elke request en houdt de Supabase-sessie
// vers. Auth-guards (redirect onuit-ingelogden weg van /dashboard etc.)
// komen in M2b zodra de auth-pagina's er zijn.

import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Sla over: static assets, images, en /api routes. API-routes handelen
    // hun eigen auth via createClient() in de route — geen session-refresh
    // overhead per call (was oorzaak van 504 timeouts op /api/audit waar
    // de middleware tegen Supabase hing).
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
