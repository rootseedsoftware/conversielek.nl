// Cookie-policy — aparte pagina naast de banner, conform AVG + ePrivacy.
//
// De banner zelf vraagt om consent; deze pagina legt uit wélke cookies
// we plaatsen, welk doel, hoe lang ze bewaard blijven, en hoe je ze
// weigert of intrekt. Standaard Nederlandse opzet.
//
// Belangrijk: deze app gebruikt momenteel ALLEEN functionele cookies
// (Supabase auth + cl_active_workspace_id voor M5b). Geen tracking,
// geen analytics, geen advertentie-cookies. Dat is zowel waar als
// strategisch handig — geen cookie-consent nodig voor functionele
// cookies onder ePrivacy-richtlijn. De banner blijft staan voor het
// geval we later analytics toevoegen.

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { company } from '@/lib/data/company';

export const metadata = {
  title: `Cookie-policy — ${company.tradeName}`,
  description: `Welke cookies ${company.tradeName} plaatst en waarom.`,
};

type CookieRow = {
  name: string;
  type: 'functioneel' | 'analytisch' | 'marketing';
  doel: string;
  retentie: string;
  partij: string;
};

const cookies: CookieRow[] = [
  {
    name: 'sb-access-token / sb-refresh-token',
    type: 'functioneel',
    doel: 'Houdt je inlog-sessie actief zodat je niet bij elke navigatie opnieuw hoeft in te loggen.',
    retentie: 'Sessie + 7 dagen (refresh-token)',
    partij: 'Conversielek (via Supabase)',
  },
  {
    name: 'cl_active_workspace_id',
    type: 'functioneel',
    doel: 'Onthoudt welke workspace je actief had, zodat je bij volgend bezoek direct in dezelfde context terechtkomt.',
    retentie: '1 jaar',
    partij: 'Conversielek',
  },
  {
    name: 'cl_cookie_consent',
    type: 'functioneel',
    doel: 'Onthoudt je keuze in de cookie-banner, zodat we die niet bij elk bezoek opnieuw tonen.',
    retentie: '1 jaar',
    partij: 'Conversielek',
  },
];

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <nav className="border-b border-slate-100 dark:border-slate-800 bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-900 dark:text-slate-100">{company.tradeName}</span>
          </Link>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Cookie-policy</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-10">
          Laatst bijgewerkt:{' '}
          {new Date(company.legalUpdatedAt).toLocaleDateString('nl-NL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">1. Wat zijn cookies?</h2>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            Cookies zijn kleine tekstbestanden die door je browser worden bewaard wanneer je een
            website bezoekt. Wij gebruiken cookies uitsluitend voor het functioneren van de Dienst
            (inloggen, voorkeur-instellingen). Geen tracking, geen analytics, geen advertentie-cookies.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">2. Welke cookies plaatsen wij?</h2>
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Cookie</th>
                  <th className="text-left px-4 py-3 font-semibold">Type</th>
                  <th className="text-left px-4 py-3 font-semibold">Doel</th>
                  <th className="text-left px-4 py-3 font-semibold">Retentie</th>
                  <th className="text-left px-4 py-3 font-semibold">Partij</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cookies.map((c) => (
                  <tr key={c.name} className="align-top">
                    <td className="px-4 py-3 font-mono text-xs text-slate-900 dark:text-slate-100 break-all">{c.name}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 capitalize">{c.type}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{c.doel}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{c.retentie}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{c.partij}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">3. Geen toestemming nodig</h2>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            De cookies hierboven zijn strikt noodzakelijk voor het functioneren van de Dienst en
            vallen daarmee onder de uitzondering van artikel 11.7a lid 3 sub b Telecommunicatiewet.
            Hiervoor is geen voorafgaande toestemming vereist. Mocht je toch geen cookies willen
            accepteren, dan kun je deze in je browser blokkeren — wees je ervan bewust dat inloggen
            dan niet meer werkt.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">4. Toekomstige analytics</h2>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            Mochten wij in de toekomst analytics of andere niet-strikt-noodzakelijke cookies
            introduceren, dan vragen wij hiervoor expliciet en vooraf toestemming via een
            cookie-banner. Je kunt die toestemming altijd intrekken via de instellingen in je
            account of door je browser-cookies te wissen.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">5. Hoe verwijder ik cookies?</h2>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            Alle browsers bieden de mogelijkheid om cookies te bekijken, te verwijderen of
            volledig te weigeren. Raadpleeg de handleiding van je browser:
          </p>
          <ul className="list-disc pl-6 text-slate-700 dark:text-slate-300 space-y-1 mt-2">
            <li>
              <a
                href="https://support.google.com/chrome/answer/95647"
                className="text-orange-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Chrome
              </a>
            </li>
            <li>
              <a
                href="https://support.mozilla.org/nl/kb/cookies-verwijderen-gegevens-wissen-websites-opgeslagen"
                className="text-orange-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Mozilla Firefox
              </a>
            </li>
            <li>
              <a
                href="https://support.apple.com/nl-nl/guide/safari/sfri11471/mac"
                className="text-orange-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Apple Safari
              </a>
            </li>
            <li>
              <a
                href="https://support.microsoft.com/nl-nl/microsoft-edge"
                className="text-orange-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Microsoft Edge
              </a>
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">6. Contact</h2>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            Vragen over deze cookie-policy? Mail{' '}
            <a
              href={`mailto:${company.email.privacy}`}
              className="text-orange-600 hover:underline"
            >
              {company.email.privacy}
            </a>
            . Zie ook onze{' '}
            <Link href="/privacy" className="text-orange-600 hover:underline">
              privacyverklaring
            </Link>
            .
          </p>
        </section>
      </article>
    </div>
  );
}
