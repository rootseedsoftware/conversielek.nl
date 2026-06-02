// Contact-pagina — wettelijk vereist onder Dienstenwet + Telecomwet:
// een NL-handelende dienst moet de bedrijfsidentiteit, het adres en
// een directe contactmogelijkheid (e-mail of telefoon) tonen op een
// gemakkelijk toegankelijke plek.
//
// Geen contact-formulier voor MVP — pure mailto-link is voldoende en
// voorkomt extra spam-buffer-laag. Kan later vervangen worden door
// een Resend-based form als volume toeneemt.

import Link from 'next/link';
import { ShoppingCart, Mail, MapPin, FileText, Building2 } from 'lucide-react';
import { company } from '@/lib/data/company';

export const metadata = {
  title: `Contact — ${company.tradeName}`,
  description: `Bereik ${company.tradeName} via e-mail of post. Bedrijfsgegevens van ${company.legalName}.`,
};

export default function ContactPage() {
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
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3">Contact</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-10">
          {company.tradeName} is een dienst van {company.legalName}. Hieronder vind je hoe je ons
          kunt bereiken en welke wettelijke bedrijfsgegevens van toepassing zijn.
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          <ContactCard
            icon={<Mail className="w-5 h-5 text-orange-500" />}
            title="Algemeen / support"
            body={
              <a
                href={`mailto:${company.email.general}`}
                className="text-orange-600 hover:underline break-all"
              >
                {company.email.general}
              </a>
            }
            note="We reageren binnen 1 werkdag."
          />
          <ContactCard
            icon={<FileText className="w-5 h-5 text-orange-500" />}
            title="Privacy / AVG"
            body={
              <a
                href={`mailto:${company.email.privacy}`}
                className="text-orange-600 hover:underline break-all"
              >
                {company.email.privacy}
              </a>
            }
            note="Inzage-, verwijderings- en bezwaarverzoeken."
          />
          <ContactCard
            icon={<Building2 className="w-5 h-5 text-orange-500" />}
            title="Juridisch / DPA"
            body={
              <a
                href={`mailto:${company.email.legal}`}
                className="text-orange-600 hover:underline break-all"
              >
                {company.email.legal}
              </a>
            }
            note="Verwerkersovereenkomsten en contractvragen."
          />
          <ContactCard
            icon={<MapPin className="w-5 h-5 text-orange-500" />}
            title="Postadres"
            body={
              <span className="text-slate-700 dark:text-slate-300">
                {company.address.street}
                <br />
                {company.address.postalCode} {company.address.city}
                <br />
                {company.address.country}
              </span>
            }
          />
        </div>

        <section className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 mb-10">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Wettelijke bedrijfsgegevens</h2>
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Statutaire naam</dt>
              <dd className="text-slate-900 dark:text-slate-100 font-medium">{company.legalName}</dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Handelsnaam</dt>
              <dd className="text-slate-900 dark:text-slate-100 font-medium">{company.tradeName}</dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">KvK-nummer</dt>
              <dd className="text-slate-900 dark:text-slate-100 font-medium">{company.kvk}</dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">BTW-nummer</dt>
              <dd className="text-slate-900 dark:text-slate-100 font-medium">{company.btw}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-slate-500 dark:text-slate-400">Vestigingsadres</dt>
              <dd className="text-slate-900 dark:text-slate-100 font-medium">
                {company.address.street}, {company.address.postalCode} {company.address.city},{' '}
                {company.address.country}
              </dd>
            </div>
          </dl>
        </section>

        <section className="text-sm text-slate-600 dark:text-slate-400">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">Klachtenregeling</h2>
          <p className="leading-relaxed">
            Ben je ontevreden over onze dienstverlening? Stuur dan eerst een mail naar{' '}
            <a
              href={`mailto:${company.email.general}`}
              className="text-orange-600 hover:underline"
            >
              {company.email.general}
            </a>
            . Komen we er niet samen uit, dan kun je je klacht voorleggen aan de bevoegde rechter,
            of — voor privacy-gerelateerde klachten — bij de Autoriteit Persoonsgegevens via{' '}
            <a
              href="https://www.autoriteitpersoonsgegevens.nl"
              className="text-orange-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              autoriteitpersoonsgegevens.nl
            </a>
            .
          </p>
        </section>
      </article>
    </div>
  );
}

function ContactCard({
  icon,
  title,
  body,
  note,
}: {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
  note?: string;
}) {
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-orange-300 transition">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{title}</h3>
      </div>
      <div className="text-sm">{body}</div>
      {note && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">{note}</p>}
    </div>
  );
}
