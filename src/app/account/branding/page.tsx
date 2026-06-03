// Sprint M6 — /account/branding pagina (white-label config).
//
// Server Component: laadt huidige branding + render BrandingForm (client)
// met initial values. Geen tier-gating in MVP — alle ingelogde users
// kunnen branding instellen voor testing. Tier-gate komt later als
// Mollie groen is.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ShoppingCart, ArrowLeft, Palette } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getMyBranding, getLogoPublicUrl } from '@/lib/branding';
import BrandingForm from './BrandingForm';

export const metadata = {
  title: 'White-label branding — Conversielek',
};

export default async function BrandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?error=' + encodeURIComponent('Log in om branding in te stellen.'));

  const branding = await getMyBranding();
  const logoUrl = await getLogoPublicUrl(branding?.logoPath ?? null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30 dark:bg-slate-900 flex flex-col">
      <nav className="border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-900 dark:text-slate-100">Conversielek</span>
          </Link>
          <Link
            href="/account"
            className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
            Terug naar account
          </Link>
        </div>
      </nav>

      <div className="flex-1 px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-start gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                White-label branding
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm leading-relaxed">
                Pas PDF-rapporten aan met je eigen logo, kleuren en footer-tekst. Klant ziet het
                rapport alsof het van jouw bureau komt — Conversielek treedt op de achtergrond.
              </p>
            </div>
          </div>

          <BrandingForm initialBranding={branding} initialLogoUrl={logoUrl} />
        </div>
      </div>
    </div>
  );
}
