'use server';

// Server Actions voor auth-flows. Worden vanuit de login/signup forms
// aangeroepen via <form action={signIn}>.
//
// Op succes: redirect naar /. Op fout: redirect naar /login of /signup
// met ?error=... zodat de page de error-string kan tonen.

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

function errorParam(message: string): string {
  return `?error=${encodeURIComponent(message)}`;
}

export async function signIn(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    redirect('/login' + errorParam('Vul e-mail en wachtwoord in.'));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Mapping naar NL-meldingen voor de meest voorkomende fouten
    const msg =
      error.message === 'Invalid login credentials'
        ? 'E-mail of wachtwoord klopt niet.'
        : error.message === 'Email not confirmed'
        ? 'Bevestig eerst je e-mail via de link in je inbox.'
        : `Inloggen mislukt: ${error.message}`;
    redirect('/login' + errorParam(msg));
  }

  revalidatePath('/', 'layout');
  redirect('/');
}

export async function signUp(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    redirect('/signup' + errorParam('Vul e-mail en wachtwoord in.'));
  }
  if (password.length < 8) {
    redirect('/signup' + errorParam('Wachtwoord moet minimaal 8 karakters zijn.'));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    const msg =
      error.message.includes('already registered')
        ? 'Dit e-mailadres heeft al een account. Log in.'
        : `Aanmelden mislukt: ${error.message}`;
    redirect('/signup' + errorParam(msg));
  }

  revalidatePath('/', 'layout');
  redirect('/');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}

export async function forgotPassword(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();

  if (!email) {
    redirect('/forgot-password' + errorParam('Vul je e-mailadres in.'));
  }

  // Bouw redirect-URL op zodat de link in de e-mail naar deze deployment
  // wijst (productie of preview). Supabase stuurt z'n template-link met
  // {{ .ConfirmationURL }} die naar /auth/confirm wijst, en die geleidt
  // de user na verify door naar /account?reset=ok.
  const hdrs = await headers();
  const host = hdrs.get('host') ?? 'conversielek.nl';
  const proto = hdrs.get('x-forwarded-proto') ?? 'https';
  const origin = `${proto}://${host}`;

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/account?reset=ok`,
  });

  // Altijd dezelfde melding — anders kun je via dit endpoint testen
  // welke e-mailadressen wel/niet in de database staan (account-enumeration).
  redirect('/forgot-password?sent=1');
}

export async function changePassword(formData: FormData) {
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  if (!password || password.length < 8) {
    redirect('/account' + errorParam('Wachtwoord moet minimaal 8 karakters zijn.'));
  }
  if (password !== confirm) {
    redirect('/account' + errorParam('Wachtwoorden komen niet overeen.'));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect('/account' + errorParam(`Wijzigen mislukt: ${error.message}`));
  }

  revalidatePath('/account');
  redirect('/account?success=Wachtwoord+gewijzigd');
}
