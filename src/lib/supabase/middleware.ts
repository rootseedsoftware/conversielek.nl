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

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
