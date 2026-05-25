// Session refresh middleware. Wordt aangeroepen vanuit src/middleware.ts
// bij elke request en zorgt dat de Supabase-sessie geldig blijft door
// expired access tokens te refreshen via de refresh_token in de cookie.
//
// Belangrijk: tussen createServerClient() en supabase.auth.getUser() mag
// GEEN andere logica zitten. Anders verlies je race-condities tussen
// concurrent requests die de session refreshen.

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Defensive: als de Supabase env vars (nog) niet zijn gezet (bv. eerste
  // Vercel-deploy zonder env vars), laat de request gewoon door zonder
  // session-refresh in plaats van een 500 MIDDLEWARE_INVOCATION_FAILED
  // te gooien op elke request.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[supabase/middleware] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY missing — skipping session refresh.'
      );
    }
    return supabaseResponse;
  }

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh de sessie. NIETS hierboven verwijderen of toevoegen.
  await supabase.auth.getUser();

  return supabaseResponse;
}
