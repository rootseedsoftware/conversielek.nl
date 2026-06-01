// Verwerkersovereenkomst (DPA) — model-DPA conform art. 28 AVG.
//
// Doelgroep: agencies en webshops die screenshots uploaden waarop
// klantgegevens zichtbaar kunnen zijn (bv. order-overzichten met namen).
// Voor hen verwerken wij persoonsgegevens "ten behoeve van" de
// verwerkingsverantwoordelijke — dus is een DPA verplicht.
//
// Default-status: door akkoord met onze Algemene voorwaarden bij signup
// gaat de Gebruiker akkoord met deze DPA. Voor klanten die liever een
// getekend PDF willen kan dat op aanvraag (legal-email).
//
// MVP-tekst — laat door jurist nakijken voor productie, vooral wanneer
// je je eerste Agency-klant binnenhaalt.

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { company } from '@/lib/data/company';

export const metadata = {
  title: `Verwerkersovereenkomst — ${company.tradeName}`,
  description: `Model-verwerkersovereenkomst (DPA) tussen klanten en ${company.tradeName}.`,
};

export default function DPAPage() {
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

      <article className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Verwerkersovereenkomst</h1>
        <p className="text-sm text-slate-500 mb-6">
          Laatst bijgewerkt:{' '}
          {new Date(company.legalUpdatedAt).toLocaleDateString('nl-NL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-10 text-sm text-amber-900">
          <strong>Akkoord-status:</strong> door je account aan te maken en de Algemene voorwaarden
          te accepteren ga je tevens akkoord met deze verwerkersovereenkomst, voor zover je in de
          rol van verwerkingsverantwoordelijke persoonsgegevens van derden uploadt naar de Dienst.
          Een ondertekend PDF-exemplaar is op verzoek beschikbaar via{' '}
          <a href={`mailto:${company.email.legal}`} className="underline">
            {company.email.legal}
          </a>
          .
        </div>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Partijen</h2>
          <p className="text-slate-700 leading-relaxed">
            <strong>Verwerker:</strong> {company.legalName}, KvK {company.kvk}, gevestigd te{' '}
            {company.address.street}, {company.address.postalCode} {company.address.city}.
          </p>
          <p className="text-slate-700 leading-relaxed mt-2">
            <strong>Verwerkingsverantwoordelijke:</strong> de natuurlijke of rechtspersoon die een
            account heeft op {company.tradeName} en persoonsgegevens van derden (zoals eigen
            webshop-klanten) uploadt naar de Dienst — hierna: <em>Klant</em>.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Onderwerp en duur</h2>
          <p className="text-slate-700 leading-relaxed">
            Deze verwerkersovereenkomst regelt de verwerking door {company.tradeName} van
            persoonsgegevens namens de Klant in het kader van het gebruik van de Dienst. De
            overeenkomst loopt voor de duur van de hoofdovereenkomst (de Algemene voorwaarden +
            actief account) en eindigt automatisch bij beëindiging daarvan.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">2. Aard en doel van de verwerking</h2>
          <p className="text-slate-700 leading-relaxed mb-2">
            {company.tradeName} verwerkt persoonsgegevens uitsluitend voor de uitvoering van de
            Dienst: het genereren van UX-audits op basis van door de Klant aangeleverde screenshots
            en webshop-context.
          </p>
          <p className="text-slate-700 leading-relaxed">
            <strong>Categorieën persoonsgegevens:</strong> namen, adresgegevens, e-mailadressen en
            overige persoonsgegevens die zichtbaar kunnen zijn in screenshots van de Klant
            (bijvoorbeeld op order-overzichten of klantaccount-pagina&apos;s).
          </p>
          <p className="text-slate-700 leading-relaxed mt-2">
            <strong>Categorieën betrokkenen:</strong> eindklanten van de Klant, voor zover hun
            gegevens in geüploade screenshots voorkomen.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">3. Instructies van de Klant</h2>
          <p className="text-slate-700 leading-relaxed">
            {company.tradeName} verwerkt persoonsgegevens uitsluitend op basis van schriftelijke
            instructies van de Klant. Het uploaden van een screenshot via de Dienst geldt als zo&apos;n
            instructie tot AI-analyse. {company.tradeName} zal geen verwerkingen uitvoeren buiten
            deze instructies om, tenzij wettelijk vereist.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Vertrouwelijkheid</h2>
          <p className="text-slate-700 leading-relaxed">
            {company.tradeName} verplicht haar medewerkers en externe verwerkers tot geheimhouding
            ten aanzien van persoonsgegevens waarvan zij kennis nemen in het kader van de uitvoering
            van de Dienst.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">5. Beveiligingsmaatregelen</h2>
          <p className="text-slate-700 leading-relaxed mb-2">
            {company.tradeName} treft passende technische en organisatorische maatregelen om
            persoonsgegevens te beveiligen, waaronder:
          </p>
          <ul className="list-disc pl-6 text-slate-700 space-y-1">
            <li>Versleutelde verbindingen (TLS 1.2+) voor al het dataverkeer;</li>
            <li>Row-level security op database-niveau zodat tenants strikt gescheiden zijn;</li>
            <li>Wachtwoord-hashing volgens industriestandaard (bcrypt/argon2);</li>
            <li>Beperkte toegang tot productie-systemen, gelogd en auditbaar;</li>
            <li>Tweejaarlijkse evaluatie van security-procedures.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">6. Sub-verwerkers</h2>
          <p className="text-slate-700 leading-relaxed">
            De Klant geeft hierbij algemene toestemming voor het inschakelen van sub-verwerkers door{' '}
            {company.tradeName}. De actuele lijst is te raadplegen op{' '}
            <Link href="/sub-processors" className="text-orange-600 hover:underline">
              conversielek.nl/sub-processors
            </Link>
            . Bij toevoeging of vervanging van een sub-verwerker informeert {company.tradeName} de
            Klant minimaal 14 dagen van tevoren per e-mail, waarbij de Klant gerechtigd is om binnen
            14 dagen na kennisgeving schriftelijk bezwaar te maken. Bij gegrond bezwaar mag de Klant
            de overeenkomst beëindigen met restitutie van vooruitbetaalde abonnementskosten pro rata.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">7. Doorgifte buiten de EER</h2>
          <p className="text-slate-700 leading-relaxed">
            Voor zover persoonsgegevens worden doorgegeven aan sub-verwerkers buiten de Europese
            Economische Ruimte, geschiedt dit op basis van de Standard Contractual Clauses van de
            Europese Commissie en — indien van toepassing — het EU-US Data Privacy Framework. Zie de
            sub-processors-pagina voor de doorgifte-basis per partij.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">8. Datalekken</h2>
          <p className="text-slate-700 leading-relaxed">
            {company.tradeName} informeert de Klant zonder onredelijke vertraging — en in elk geval
            binnen 48 uur na ontdekking — over inbreuken in verband met persoonsgegevens. De
            melding bevat de aard van de inbreuk, betrokken categorieën gegevens, vermoedelijke
            gevolgen en getroffen maatregelen, zodat de Klant tijdig kan voldoen aan haar eigen
            meldplicht onder artikel 33/34 AVG.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">9. Rechten van betrokkenen</h2>
          <p className="text-slate-700 leading-relaxed">
            {company.tradeName} verleent de Klant redelijke medewerking bij het beantwoorden van
            verzoeken van betrokkenen tot inzage, correctie, verwijdering, beperking of overdracht.
            Verzoeken die rechtstreeks bij {company.tradeName} binnenkomen worden zonder
            inhoudelijke behandeling doorgestuurd naar de Klant.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">10. Audit-recht</h2>
          <p className="text-slate-700 leading-relaxed">
            De Klant is gerechtigd om eenmaal per kalenderjaar — of vaker indien wettelijk vereist —
            de naleving van deze overeenkomst te (laten) controleren, op basis van een door beide
            partijen overeen te komen procedure en kostenverdeling. {company.tradeName} levert
            redelijke medewerking en stelt op verzoek beschikbare assurance-rapportages (zoals SOC2
            van sub-verwerkers) ter beschikking.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">11. Beëindiging</h2>
          <p className="text-slate-700 leading-relaxed">
            Na beëindiging van de hoofdovereenkomst verwijdert {company.tradeName} alle
            persoonsgegevens van de Klant binnen 30 dagen, behoudens een wettelijke bewaarplicht.
            Op verzoek wordt vooraf een export geleverd in een gangbaar formaat (JSON/CSV).
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">12. Aansprakelijkheid</h2>
          <p className="text-slate-700 leading-relaxed">
            De aansprakelijkheidsregeling uit de{' '}
            <Link href="/algemene-voorwaarden" className="text-orange-600 hover:underline">
              Algemene voorwaarden
            </Link>{' '}
            is van toepassing, voor zover wettelijk toegestaan. Boetes opgelegd door de Autoriteit
            Persoonsgegevens aan de Klant naar aanleiding van een tekortkoming van{' '}
            {company.tradeName} kan de Klant verhalen tot het in de AV genoemde maximum.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">13. Toepasselijk recht</h2>
          <p className="text-slate-700 leading-relaxed">
            Op deze overeenkomst is Nederlands recht van toepassing. Geschillen worden voorgelegd
            aan de bevoegde rechter in het arrondissement waar {company.tradeName} is gevestigd.
          </p>
        </section>

        <p className="text-xs text-slate-400 italic mt-10 border-t border-slate-100 pt-4">
          Model-DPA gebaseerd op de modelclausules van de Europese Commissie en de Nederlandse
          Vereniging van DPO&apos;s. Voor maatwerk of een getekend PDF-exemplaar: neem contact op
          via{' '}
          <a href={`mailto:${company.email.legal}`} className="underline">
            {company.email.legal}
          </a>
          .
        </p>
      </article>
    </div>
  );
}
