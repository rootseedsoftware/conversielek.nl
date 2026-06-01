// Privacyverklaring — verplicht onder AVG zodra je persoonsgegevens
// verwerkt. Onderstaande tekst is een werkbare MVP-template gebaseerd
// op de standaard AP-richtlijn + Thuiswinkel.org modelteksten. Laat
// dit door een jurist nakijken voordat je betalingen accepteert.

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { company } from '@/lib/data/company';

export const metadata = {
  title: `Privacyverklaring — ${company.tradeName}`,
  description: `Hoe ${company.tradeName} omgaat met persoonsgegevens van webshop-eigenaren.`,
};

export default function PrivacyPage() {
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

      <article className="max-w-3xl mx-auto px-6 py-12 prose prose-slate">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacyverklaring</h1>
        <p className="text-sm text-slate-500 mb-10">
          Laatst bijgewerkt: {new Date(company.legalUpdatedAt).toLocaleDateString('nl-NL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Wie zijn wij?</h2>
          <p className="text-slate-700 leading-relaxed">
            {company.tradeName} is een dienst van <strong>{company.legalName}</strong>,
            gevestigd te {company.address.city}, ingeschreven bij de Kamer van Koophandel
            onder nummer <strong>{company.kvk}</strong>. Wij zijn verantwoordelijk voor de
            verwerking van persoonsgegevens zoals beschreven in deze verklaring.
          </p>
          <p className="text-slate-700 leading-relaxed mt-2">
            Voor privacy-gerelateerde vragen kun je contact opnemen via{' '}
            <a href={`mailto:${company.email.privacy}`} className="text-orange-600 hover:underline">
              {company.email.privacy}
            </a>
            .
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">2. Welke gegevens verwerken wij?</h2>
          <ul className="list-disc pl-6 text-slate-700 space-y-2">
            <li>
              <strong>Accountgegevens:</strong> e-mailadres en wachtwoord-hash (versleuteld) van
              ingelogde gebruikers.
            </li>
            <li>
              <strong>Audit-content:</strong> screenshots die je uploadt, ingevulde webshop-naam,
              URL, doelgroep en uitdaging-omschrijving, plus de door de AI gegenereerde audit-output.
            </li>
            <li>
              <strong>Technische gegevens:</strong> IP-adres, browser-type, request-tijdstip — alleen
              tijdelijk voor rate-limiting en foutopsporing.
            </li>
            <li>
              <strong>Cookies:</strong> alleen functionele cookies voor je inlog-sessie. Geen tracking
              of analytics-cookies.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">3. Waarvoor gebruiken wij deze gegevens?</h2>
          <ul className="list-disc pl-6 text-slate-700 space-y-2">
            <li>Account aanmaken en je laten inloggen (grondslag: uitvoering overeenkomst).</li>
            <li>Audit-rapporten genereren en bewaren voor jouw eigen toegang (uitvoering overeenkomst).</li>
            <li>Misbruik tegengaan via rate-limiting (gerechtvaardigd belang).</li>
            <li>Communicatie over je account (uitvoering overeenkomst).</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Met wie delen wij gegevens?</h2>
          <p className="text-slate-700 leading-relaxed mb-3">
            Wij gebruiken de volgende sub-verwerkers die gegevens kunnen zien voor zover noodzakelijk
            voor hun dienst:
          </p>
          <ul className="list-disc pl-6 text-slate-700 space-y-2">
            <li>
              <strong>Supabase</strong> (database + authenticatie) — servers in Frankfurt, Duitsland (EU).
            </li>
            <li>
              <strong>Vercel</strong> (hosting) — verkeer kan via servers buiten de EU lopen. Vercel is
              gecertificeerd onder het EU-US Data Privacy Framework (DPF).
            </li>
            <li>
              <strong>Anthropic</strong> (AI-analyse van screenshots) — servers in de Verenigde Staten,
              datatransfer beveiligd via Standard Contractual Clauses (SCC&apos;s). Screenshots worden
              door Anthropic niet gebruikt voor modeltraining (per Anthropic API-beleid).
            </li>
            <li>
              <strong>Mollie</strong> (betalingsverwerker, alleen voor betalende abonnementen) — gevestigd
              in Amsterdam, Nederland (EU). Mollie verwerkt jouw betaalgegevens als zelfstandig
              verantwoordelijke conform haar eigen privacyverklaring.
            </li>
            <li>
              <strong>Resend</strong> (e-mailverzending van transactionele berichten zoals welkom-mails,
              wachtwoord-reset en audit-rapporten) — servers in de Verenigde Staten, datatransfer
              beveiligd via SCC&apos;s.
            </li>
          </ul>
          <p className="text-slate-700 leading-relaxed mt-3">
            De actuele lijst van sub-verwerkers is altijd in te zien op{' '}
            <Link href="/sub-processors" className="text-orange-600 hover:underline">
              conversielek.nl/sub-processors
            </Link>
            . Wij verkopen jouw gegevens nooit aan derden voor marketing-doeleinden.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">5. Datalekken</h2>
          <p className="text-slate-700 leading-relaxed">
            Bij een datalek dat een hoog risico oplevert voor de rechten en vrijheden van betrokkenen,
            melden wij dit binnen 72 uur na ontdekking aan de Autoriteit Persoonsgegevens en informeren
            wij betrokken gebruikers per e-mail, conform artikel 33 en 34 AVG. Onze incident-procedures
            worden tweejaarlijks geëvalueerd.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">6. Hoe lang bewaren wij gegevens?</h2>
          <ul className="list-disc pl-6 text-slate-700 space-y-2">
            <li>
              <strong>Account-gegevens:</strong> zolang je account actief is. Bij verwijdering: binnen 30
              dagen volledig gewist.
            </li>
            <li>
              <strong>Audit-rapporten:</strong> zolang je ze in je account bewaart. Je kunt ze op elk
              moment zelf verwijderen via &quot;Mijn audits&quot;.
            </li>
            <li>
              <strong>Screenshots:</strong> alleen tijdelijk verwerkt voor de AI-analyse, daarna niet
              door ons opgeslagen (alleen het tekst-rapport wordt bewaard).
            </li>
            <li>
              <strong>Server-logs:</strong> maximaal 30 dagen voor foutopsporing en misbruik-bestrijding.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">7. Jouw rechten</h2>
          <p className="text-slate-700 leading-relaxed mb-3">
            Onder de AVG heb je het recht op:
          </p>
          <ul className="list-disc pl-6 text-slate-700 space-y-2">
            <li>Inzage in welke gegevens wij van je hebben.</li>
            <li>Correctie van onjuiste gegevens.</li>
            <li>Verwijdering van je account en gegevens.</li>
            <li>Beperking van de verwerking.</li>
            <li>Dataportabiliteit (export van je audits).</li>
            <li>Bezwaar tegen de verwerking.</li>
            <li>
              Klacht indienen bij de Autoriteit Persoonsgegevens via{' '}
              <a
                href="https://www.autoriteitpersoonsgegevens.nl"
                className="text-orange-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                autoriteitpersoonsgegevens.nl
              </a>
              .
            </li>
          </ul>
          <p className="text-slate-700 leading-relaxed mt-3">
            Een verzoek doe je via{' '}
            <a href={`mailto:${company.email.privacy}`} className="text-orange-600 hover:underline">
              {company.email.privacy}
            </a>
            . Wij reageren binnen 30 dagen.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">8. Beveiliging</h2>
          <p className="text-slate-700 leading-relaxed">
            Wij nemen passende technische en organisatorische maatregelen: versleutelde verbindingen
            (TLS/HTTPS), row-level security op database-niveau zodat alleen jij je eigen audits ziet,
            wachtwoord-hashing volgens industriestandaard, en beperkte toegang tot productie-systemen.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">9. Wijzigingen</h2>
          <p className="text-slate-700 leading-relaxed">
            Wij kunnen deze verklaring aanpassen. De datum bovenaan toont wanneer de laatste wijziging
            is doorgevoerd. Bij materiële wijzigingen informeren wij ingelogde gebruikers per e-mail.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">10. Contact</h2>
          <p className="text-slate-700 leading-relaxed">
            {company.legalName}
            <br />
            {company.address.street}
            <br />
            {company.address.postalCode} {company.address.city}
            <br />
            {company.address.country}
            <br />
            KvK: {company.kvk}
            <br />
            E-mail:{' '}
            <a href={`mailto:${company.email.privacy}`} className="text-orange-600 hover:underline">
              {company.email.privacy}
            </a>
          </p>
        </section>

        <p className="text-xs text-slate-400 italic mt-10 border-t border-slate-100 pt-4">
          Deze tekst is een werkbare MVP-template. Voor productie raden wij aan deze door een
          jurist te laten controleren, vooral wanneer je betalingen verwerkt of bijzondere
          persoonsgegevens opslaat.
        </p>
      </article>
    </div>
  );
}
