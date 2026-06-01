// Sub-processors-pagina — apart van /privacy voor compliance-doelen.
//
// Reden voor aparte pagina: agencies en grotere klanten willen vaak een
// directe link naar de actuele sub-processor-lijst kunnen zetten in hun
// eigen verwerkersregister + DPA met hun klanten. Aparte URL geeft hen
// een stabiele referentie zonder ze door de hele privacyverklaring te
// laten scrollen.
//
// Volgens AVG art. 28 lid 2: bij toevoeging of vervanging van een
// sub-verwerker moeten klanten geïnformeerd worden met gelegenheid
// bezwaar te maken. Voor MVP: notificatie via e-mail aan ingelogde
// users + bump van legalUpdatedAt.

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { company } from '@/lib/data/company';

export const metadata = {
  title: `Sub-verwerkers — ${company.tradeName}`,
  description: `Actuele lijst van sub-verwerkers die ${company.tradeName} inschakelt voor de dienstverlening.`,
};

type SubProcessor = {
  name: string;
  doel: string;
  locatie: string;
  transferBasis: string;
  url: string;
};

const subProcessors: SubProcessor[] = [
  {
    name: 'Supabase Inc.',
    doel: 'Database (Postgres), authenticatie en file-storage voor audit-data.',
    locatie: 'Frankfurt, Duitsland (EU)',
    transferBasis: 'Binnen EER — geen aanvullende waarborgen vereist',
    url: 'https://supabase.com/privacy',
  },
  {
    name: 'Vercel Inc.',
    doel: 'Hosting + CDN van de Conversielek-webapplicatie.',
    locatie: 'Verenigde Staten (met edge-nodes wereldwijd)',
    transferBasis: 'EU-US Data Privacy Framework (DPF) + Standard Contractual Clauses',
    url: 'https://vercel.com/legal/privacy-policy',
  },
  {
    name: 'Anthropic, PBC',
    doel: 'AI-analyse van geüploade screenshots (Claude API).',
    locatie: 'Verenigde Staten',
    transferBasis: 'Standard Contractual Clauses (SCC\'s) + Anthropic Data Processing Addendum',
    url: 'https://www.anthropic.com/legal/privacy',
  },
  {
    name: 'Mollie B.V.',
    doel: 'Verwerking van betalingen voor betaalde abonnementen (iDEAL, creditcard, etc).',
    locatie: 'Amsterdam, Nederland (EU)',
    transferBasis: 'Binnen EER — zelfstandig verantwoordelijke voor betaalgegevens',
    url: 'https://www.mollie.com/nl/privacy',
  },
  {
    name: 'Resend, Inc.',
    doel: 'Verzending van transactionele e-mails (welkom, wachtwoord-reset, audit-rapporten).',
    locatie: 'Verenigde Staten',
    transferBasis: 'Standard Contractual Clauses (SCC\'s) + Resend DPA',
    url: 'https://resend.com/legal/privacy-policy',
  },
];

export default function SubProcessorsPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-slate-100 bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-900">{company.tradeName}</span>
          </Link>
        </div>
      </nav>

      <article className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Sub-verwerkers</h1>
        <p className="text-sm text-slate-500 mb-6">
          Laatst bijgewerkt:{' '}
          {new Date(company.legalUpdatedAt).toLocaleDateString('nl-NL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>

        <p className="text-slate-700 leading-relaxed mb-8">
          Hieronder vind je de actuele lijst van sub-verwerkers die {company.legalName} inschakelt
          voor de levering van {company.tradeName}. Wijzigingen worden minimaal 14 dagen van
          tevoren aangekondigd aan betalende klanten per e-mail, waarbij je gelegenheid hebt om
          bezwaar te maken conform artikel 28 lid 2 AVG.
        </p>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Sub-verwerker</th>
                <th className="text-left px-4 py-3 font-semibold">Doel van verwerking</th>
                <th className="text-left px-4 py-3 font-semibold">Locatie</th>
                <th className="text-left px-4 py-3 font-semibold">Doorgifte-basis</th>
                <th className="text-left px-4 py-3 font-semibold">Privacybeleid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subProcessors.map((sp) => (
                <tr key={sp.name} className="align-top">
                  <td className="px-4 py-3 font-medium text-slate-900">{sp.name}</td>
                  <td className="px-4 py-3 text-slate-700">{sp.doel}</td>
                  <td className="px-4 py-3 text-slate-700">{sp.locatie}</td>
                  <td className="px-4 py-3 text-slate-700">{sp.transferBasis}</td>
                  <td className="px-4 py-3">
                    <a
                      href={sp.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-600 hover:underline"
                    >
                      Bekijk
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Vragen of bezwaar?</h2>
          <p className="text-slate-700 leading-relaxed">
            Wil je een verwerkersovereenkomst (DPA) afsluiten of bezwaar maken tegen een
            sub-verwerker? Neem dan contact op via{' '}
            <a href={`mailto:${company.email.legal}`} className="text-orange-600 hover:underline">
              {company.email.legal}
            </a>
            . Onze model-DPA vind je op{' '}
            <Link href="/verwerkersovereenkomst" className="text-orange-600 hover:underline">
              conversielek.nl/verwerkersovereenkomst
            </Link>
            .
          </p>
        </section>
      </article>
    </div>
  );
}
