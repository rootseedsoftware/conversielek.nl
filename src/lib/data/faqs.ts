export type Faq = { q: string; a: string };

export const faqs: Faq[] = [
  {
    q: 'Voor wie is deze tool?',
    a: 'Specifiek voor eigenaren en marketeers van Nederlandse webshops die hun conversie willen verbeteren. Wij focussen op Nederlandse conventies (iDEAL, achteraf betalen, Thuiswinkel Waarborg, AVG) en spreken de taal van NL-consumenten. Niet voor Engelstalige B2B-SaaS.',
  },
  {
    q: 'Wat maakt dit anders dan internationale tools zoals Baymard of Krux?',
    a: "Drie dingen: (1) volledig in het Nederlands met NL-specifieke microcopy, (2) flow-specifieke audits (homepage, product, mandje, checkout, mobile) met Nederlandse benchmarks, en (3) conversie-impact in euro's en percentages zoals een webshop-eigenaar denkt — niet in UX-jargon.",
  },
  {
    q: 'Hoe accuraat is de AI?',
    a: "We gebruiken Claude AI met door UX-experts geschreven prompts gericht op Nederlandse webshop-conventies. Voor de meest accurate analyse: upload screenshots, niet alleen URL's. Tip: upload zowel desktop als mobile views van dezelfde flow.",
  },
  {
    q: 'Krijg ik concrete Nederlandse microcopy-suggesties?',
    a: 'Ja. Waar relevant geven we per issue een concrete microcopy-suggestie: huidige Nederlandse tekst vs voorgestelde Nederlandse tekst, geoptimaliseerd voor conversie en vertrouwen.',
  },
  {
    q: "Wat als ik een agency of freelance UX'er ben?",
    a: 'Deze versie is voor webshop-eigenaren. We werken aan een Pro-versie met white-label rapporten voor agencies en freelancers — laat je e-mail achter om als eerste te horen wanneer die beschikbaar is.',
  },
  {
    q: 'Worden mijn screenshots opgeslagen?',
    a: 'Screenshots worden alleen tijdelijk verwerkt voor de analyse. Je audit-resultaten worden lokaal in je browser bewaard — alleen jij hebt toegang.',
  },
];
