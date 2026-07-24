export type Faq = { q: string; a: string };

export const faqs: Faq[] = [
  {
    q: 'Voor wie is deze tool?',
    a: 'Specifiek voor eigenaren en marketeers van Nederlandse webshops die hun conversie willen verbeteren. Wij focussen op Nederlandse conventies (iDEAL, achteraf betalen, Thuiswinkel Waarborg, AVG) en spreken de taal van NL-consumenten. Niet voor Engelstalige B2B-SaaS.',
  },
  {
    q: 'Kan ik zonder account proberen?',
    a: 'Ja. In de Probeer-tier (€0) kun je 2 audits per maand doen zonder account. Wil je meer audits, cross-device toegang, e-mail-export en voor/na-vergelijking? Dan is een Webshop-abonnement (€19/mnd) een logische stap.',
  },
  {
    q: 'Wat maakt dit anders dan internationale tools zoals Baymard of Krux?',
    a: "Drie dingen: (1) volledig in het Nederlands met NL-specifieke microcopy, (2) flow-specifieke audits (homepage, product, mandje, checkout, mobile) met Nederlandse benchmarks (bol.com, Coolblue, Wehkamp), en (3) conversie-impact in euro's en percentages zoals een webshop-eigenaar denkt — niet in UX-jargon.",
  },
  {
    q: 'Hoe accuraat is de AI?',
    a: "We gebruiken Claude AI met door UX-experts geschreven prompts gericht op Nederlandse webshop-conventies. Elk advies krijgt een confidence-label (zeker/waarschijnlijk/mogelijk) zodat je weet hoe hard de bevinding is. Voor de meest accurate analyse: upload zowel desktop als mobile screenshots van dezelfde flow.",
  },
  {
    q: 'Krijg ik concrete Nederlandse microcopy-suggesties?',
    a: 'Ja. Waar relevant geven we per issue een concrete microcopy-suggestie: huidige Nederlandse tekst vs voorgestelde Nederlandse tekst, geoptimaliseerd voor conversie en vertrouwen. Direct te kopiëren naar je CMS.',
  },
  {
    q: "Ik ben een agency — kan ik audits doorleveren aan mijn klanten?",
    a: 'Ja, met het Agency-abonnement. Je krijgt white-label PDF-rapporten met eigen logo + huisstijl, gedeelde audit-links onder je eigen branding, klant-workspaces, API-toegang om audits vanuit eigen tooling te triggeren, en unlimited audits over meerdere webshops.',
  },
  {
    q: 'Worden mijn screenshots opgeslagen?',
    a: 'Screenshots worden alleen tijdelijk verwerkt voor de AI-analyse — daarna niet meer bij ons opgeslagen. Alleen het tekstuele audit-rapport bewaren we (voor jouw eigen toegang later). Bij een account: audits staan in versleutelde EU-database met row-level security zodat alleen jij ze ziet. Zonder account (Probeer-tier): audits staan lokaal in je browser.',
  },
  {
    q: 'Kan ik maandelijks opzeggen?',
    a: 'Ja. Alle abonnementen zijn maandelijks opzegbaar via je account-instellingen — geen opzegtermijn, geen jaarcontract-verplichting. Bij opzegging behoud je toegang tot het einde van de lopende betaalperiode. Data wordt binnen 30 dagen verwijderd (of eerder op verzoek).',
  },
  {
    q: 'Is mijn data veilig?',
    a: 'Ja. Alle verkeer via HTTPS/TLS 1.2+, database gehost in Frankfurt (EU), row-level security zodat je alleen je eigen audits ziet, wachtwoord-hashing via bcrypt/argon2. Full compliance met AVG. Zie ook onze privacyverklaring, verwerkersovereenkomst (DPA) en sub-processor-lijst.',
  },
];
