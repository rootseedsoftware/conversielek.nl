// Algemene voorwaarden — MVP-template gebaseerd op standaard Nederlandse
// SaaS-AV. Laat dit door een jurist nakijken voor productie, vooral
// vóór je M3 (betalingen) live zet.

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { company } from '@/lib/data/company';

export const metadata = {
  title: `Algemene voorwaarden — ${company.tradeName}`,
  description: `De voorwaarden waaronder ${company.tradeName} haar diensten levert.`,
};

export default function VoorwaardenPage() {
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
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Algemene voorwaarden</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-10">
          Laatst bijgewerkt: {new Date(company.legalUpdatedAt).toLocaleDateString('nl-NL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">1. Definities</h2>
          <ul className="list-disc pl-6 text-slate-700 dark:text-slate-300 space-y-1">
            <li>
              <strong>Aanbieder:</strong> {company.legalName}, KvK {company.kvk}, gevestigd te{' '}
              {company.address.city}.
            </li>
            <li>
              <strong>Dienst:</strong> de {company.tradeName}-webapplicatie en bijbehorende
              audit-functionaliteit, bereikbaar via {company.domain}.
            </li>
            <li>
              <strong>Gebruiker:</strong> iedere natuurlijke of rechtspersoon die de Dienst gebruikt
              of een account heeft aangemaakt.
            </li>
            <li>
              <strong>Account:</strong> de persoonlijke omgeving van de Gebruiker binnen de Dienst.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">2. Toepasselijkheid</h2>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            Deze voorwaarden zijn van toepassing op alle gebruik van de Dienst. Door een account aan
            te maken of de Dienst te gebruiken accepteert de Gebruiker deze voorwaarden. Afwijkende
            voorwaarden van de Gebruiker worden uitdrukkelijk van de hand gewezen.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">3. De Dienst</h2>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-3">
            De Dienst genereert UX-audits op basis van door de Gebruiker geüploade screenshots,
            gebruikmakend van AI van Anthropic. De audit-output is een hulpmiddel ter inspiratie
            en analyse — geen garantie op specifieke conversie-resultaten of geschiktheid voor een
            specifiek doel.
          </p>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            Aanbieder behoudt zich het recht voor om de Dienst, de gebruikte AI-modellen, of de
            features op elk moment aan te passen of te beëindigen, met inachtneming van een
            redelijke aankondigingstermijn bij materiële wijzigingen voor betalende gebruikers.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">4. Account en gebruik</h2>
          <ul className="list-disc pl-6 text-slate-700 dark:text-slate-300 space-y-2">
            <li>De Gebruiker is verantwoordelijk voor de geheimhouding van zijn inloggegevens.</li>
            <li>
              De Gebruiker garandeert dat geüploade screenshots geen rechten van derden schenden en
              dat hij gerechtigd is deze ter analyse aan te bieden.
            </li>
            <li>
              Misbruik van de Dienst — waaronder reverse-engineering, scraping, geautomatiseerd
              massaal gebruik buiten de gestelde limieten, of pogingen om de beveiliging te omzeilen —
              is verboden en kan leiden tot beëindiging van het Account zonder restitutie.
            </li>
            <li>
              Aanbieder mag accounts schorsen of beëindigen bij ernstig of herhaald misbruik.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">5. Prijzen en betaling</h2>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-3">
            De gratis tier geeft beperkt gebruik zonder kosten. Betaalde abonnementen worden vooraf
            gefactureerd per maand, exclusief BTW. Wijzigingen in prijzen worden minimaal 30 dagen
            van tevoren aangekondigd aan bestaande betalende gebruikers.
          </p>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            Abonnementen zijn maandelijks opzegbaar tegen het einde van de lopende periode. Reeds
            betaalde maandbedragen worden niet pro-rata gerestitueerd, tenzij sprake is van een
            wezenlijke tekortkoming van de Aanbieder.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">6. Beschikbaarheid</h2>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            Aanbieder streeft naar maximale beschikbaarheid maar geeft geen uptime-garantie. Onderhoud,
            uitval van externe diensten (zoals Anthropic of Supabase) of overmacht kunnen tijdelijk
            tot onbereikbaarheid leiden. Dit geeft geen recht op restitutie of schadevergoeding.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">7. Intellectueel eigendom</h2>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            Alle rechten op de Dienst, de broncode, het ontwerp en de merken berusten bij Aanbieder.
            Door audits te genereren krijgt de Gebruiker een niet-exclusief gebruiksrecht op de
            gegenereerde audit-output voor eigen interne en commerciële doeleinden, inclusief
            doorlevering aan eigen klanten of medewerkers.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">8. Aansprakelijkheid</h2>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-3">
            Audit-output is een geautomatiseerde analyse en geen vervanging voor professioneel UX-
            of juridisch advies. Aanbieder is niet aansprakelijk voor commerciële beslissingen
            die op basis van de output worden genomen.
          </p>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-3">
            De aansprakelijkheid van Aanbieder is in alle gevallen beperkt tot het bedrag dat de
            Gebruiker in de twaalf maanden voorafgaand aan de schadeveroorzakende gebeurtenis heeft
            betaald voor de Dienst, met een maximum van € 1.000,-.
          </p>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            Indirecte schade, gevolgschade, gederfde winst en omzetverlies zijn altijd uitgesloten.
            Deze beperkingen gelden niet bij opzet of grove schuld van Aanbieder.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">9. Persoonsgegevens</h2>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            Op de verwerking van persoonsgegevens is onze{' '}
            <Link href="/privacy" className="text-orange-600 hover:underline">
              privacyverklaring
            </Link>{' '}
            van toepassing.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">10. Beëindiging</h2>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            De Gebruiker kan zijn Account op elk moment beëindigen via de account-instellingen of
            door een verzoek te sturen aan{' '}
            <a href={`mailto:${company.email.support}`} className="text-orange-600 hover:underline">
              {company.email.support}
            </a>
            . Aanbieder verwijdert het Account en bijbehorende audits binnen 30 dagen, behoudens
            wettelijke bewaartermijnen.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">11. Wijzigingen</h2>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            Aanbieder mag deze voorwaarden wijzigen. Materiële wijzigingen worden minimaal 30 dagen
            van tevoren aangekondigd aan ingelogde gebruikers. Bij voortgezet gebruik na de
            wijzigingsdatum accepteert de Gebruiker de nieuwe voorwaarden.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">12. Toepasselijk recht en geschillen</h2>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            Op deze voorwaarden is uitsluitend Nederlands recht van toepassing. Geschillen worden
            voorgelegd aan de bevoegde rechter in het arrondissement waar Aanbieder is gevestigd,
            tenzij dwingend recht anders voorschrijft.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">13. Contact</h2>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
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
            <a href={`mailto:${company.email.legal}`} className="text-orange-600 hover:underline">
              {company.email.legal}
            </a>
          </p>
        </section>

        <p className="text-xs text-slate-400 dark:text-slate-500 italic mt-10 border-t border-slate-100 dark:border-slate-800 pt-4">
          Deze tekst is een werkbare MVP-template. Voor productie raden wij aan deze door een
          jurist te laten controleren, vooral voordat je betaalde abonnementen activeert.
        </p>
      </article>
    </div>
  );
}
