// GET /auth/confirm — verifieert de token uit Supabase e-mailtemplates
// (password-reset, signup-bevestiging, e-mail-change).
//
// Flow:
//   1. User klikt link in mail → arrive hier met ?token_hash=...&type=...&next=...
//   2. Verify token → Supabase set session-cookie automatisch
//   3. Redirect naar `next` (default /), of /login bij fout
//
// Dit is de canonical pattern uit de Supabase SSR docs voor Next.js
// App Router.

import { type NextRequest, NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/';

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.warn('[auth/confirm] verifyOtp failed:', error.message);
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(
      'De link is verlopen of ongeldig. Vraag een nieuwe aan.'
    )}`
  );
}
