// Rijke voorbeeld-audit die de "Bekijk voorbeeld-audit"-knop op de landing
// toont. Bewust uitgebreider dan de mock in claude.ts (die alleen draait
// als het hele audit-pad in demo-mode wordt aangeroepen).

import type { AuditResult } from '@/lib/claude';

export const sampleAudit: AuditResult = {
  overall_score: 6.2,
  conversion_impact_estimate:
    'Met de gevonden issues laat deze webshop naar schatting 18-28% potentiële conversie liggen. De grootste lekken zitten in vertrouwen (geen keurmerken zichtbaar) en checkout (gast-checkout ontbreekt).',
  summary:
    'Deze fashionwebshop heeft mooie producten en een schone visuele stijl, maar laat veel conversie liggen door gebrek aan vertrouwenssignalen en frictie in de checkout. Met 3-4 gerichte aanpassingen kun je waarschijnlijk binnen een maand een meetbare omzetstijging realiseren.',
  trust_score: 5,
  trust_assessment:
    "Het vertrouwen is matig. Geen Thuiswinkel Waarborg zichtbaar, klantreviews verstopt onderaan, en het retourbeleid moet je actief zoeken. Voor een fashionwebshop waar mensen 'op gevoel' kopen, is dit een grote conversie-killer.",
  dutch_benchmarks: [
    {
      what: "Vertrouwensbalk bovenaan met USP's",
      example_shop: 'Coolblue',
      why: "Coolblue toont 'Voor 23:59 besteld, morgen in huis', '30 dagen bedenktijd' en 'Gratis verzending' bovenaan elke pagina. Dit beantwoordt direct de drie grootste twijfels van een koper.",
    },
    {
      what: 'Reviews prominent op productpagina',
      example_shop: 'bol.com',
      why: 'bol.com plaatst de gemiddelde sterscore en het aantal reviews direct onder de productnaam. Sociale validatie verlaagt twijfel en verhoogt conversie aantoonbaar.',
    },
    {
      what: 'Gast-checkout zonder account-pressie',
      example_shop: 'Wehkamp',
      why: 'Wehkamp biedt gast-checkout op gelijke prominentie aan account-creatie. Verplicht account aanmaken kost gemiddeld 35% van checkouts.',
    },
  ],
  strengths: [
    "Schone visuele stijl met goede productfoto's — past bij de fashion-categorie",
    'Mobile responsive layout zonder horizontale scroll',
    'iDEAL is zichtbaar als betaaloptie in de footer (zou wel prominenter mogen)',
  ],
  issues: [
    {
      title: 'Geen Thuiswinkel Waarborg of vertrouwenslabels zichtbaar',
      severity: 'critical',
      category: 'Trust',
      description:
        'Op geen enkele pagina zie ik het Thuiswinkel Waarborg-logo, een keurmerk, of zichtbare klantbeoordelingen. Voor een onbekende webshop in fashion is dit een dealbreaker.',
      conversion_impact:
        'Geschatte impact: 15-25% verlies aan conversie bij nieuwe bezoekers. 67% van Nederlanders kijkt actief naar keurmerken bij onbekende webshops (bron: Thuiswinkel.org consumentenonderzoek).',
      recommendation:
        'Plaats Thuiswinkel Waarborg-logo + Kiyoh/Trustpilot score in de footer ÉN bij de checkout-button. Investering: €295/jaar voor het keurmerk, ROI binnen 2 weken bij gemiddeld verkeer.',
      microcopy_suggestion: null,
      principle: 'Sociale validatie + autoriteit (Cialdini) bij onbekende verkoper',
      sources: [
        {
          name: 'Thuiswinkel.org Consumentenonderzoek',
          type: 'nl_specific',
          detail: '67% van Nederlandse consumenten zoekt actief naar keurmerken bij onbekende webshops.',
        },
        {
          name: 'Cialdini - Influence: The Psychology of Persuasion',
          type: 'book',
          detail: 'Autoriteit en sociale validatie zijn twee van de zes universele beïnvloedingsprincipes.',
        },
      ],
    },
    {
      title: 'Verzendkosten onduidelijk vóór de checkout',
      severity: 'critical',
      category: 'Cart',
      description:
        "In het winkelmandje staat 'Verzendkosten worden in de volgende stap berekend'. Dit is precies de boodschap die cart abandonment veroorzaakt.",
      conversion_impact:
        'Onverwachte verzendkosten zijn de #1 reden voor cart abandonment in NL (49% volgens Baymard). Verwachte impact: 8-15% extra abandonment.',
      recommendation:
        "Toon verzendkosten direct in het mandje. Beter nog: communiceer 'Gratis verzending vanaf €50' bovenaan elke pagina als balk, zodat klanten naar dat bedrag toewerken (verhoogt AOV).",
      microcopy_suggestion:
        "Vervang 'Verzendkosten worden berekend' door 'Verzending: €4,95 (gratis vanaf €50)'",
      principle: 'Transparantie + AOV-stimulering',
      sources: [
        {
          name: 'Baymard Institute - Cart Abandonment Research',
          type: 'research',
          detail: '49% van shoppers verlaat het mandje door onverwachte extra kosten — de #1 reden voor cart abandonment.',
        },
        {
          name: "Steve Krug - Don't Make Me Think",
          type: 'book',
          detail: 'Verberg geen informatie die de gebruiker nodig heeft voor een beslissing.',
        },
      ],
    },
    {
      title: 'Account verplicht voor checkout',
      severity: 'high',
      category: 'Checkout',
      description:
        "Bij doorgaan naar de checkout word je gedwongen een account aan te maken. Geen 'verder als gast'-optie zichtbaar.",
      conversion_impact:
        'Verplicht account aanmaken kost gemiddeld 35% van checkouts. Op een omzet van €100k/maand betekent dit potentieel €35k extra omzet per maand bij gast-checkout.',
      recommendation:
        "Voeg 'Verder zonder account' als gelijkwaardige optie toe. Vraag de eventuele account-creatie pas NA de bestelling ('Wil je je gegevens bewaren voor volgende keer?').",
      microcopy_suggestion:
        "Maak twee gelijkwaardige knoppen: 'Verder als gast' en 'Inloggen / Account aanmaken'",
      principle: 'Reduceer cognitieve last in checkout (Krug)',
      sources: [
        {
          name: 'Baymard Institute - Checkout Usability',
          type: 'research',
          detail: '24% van users verlaat checkout vanwege verplicht account aanmaken — een van de top-3 redenen voor checkout-abandonment.',
        },
        {
          name: "Steve Krug - Don't Make Me Think",
          type: 'book',
          detail: 'Elke extra stap in een flow kost conversie. Minimaliseer vereisten tot het echt nodige.',
        },
      ],
    },
    {
      title: 'Achteraf betalen ontbreekt',
      severity: 'high',
      category: 'Payment',
      description: 'Ik zie alleen iDEAL en creditcard als betaalopties. Geen Klarna, Riverty of AfterPay.',
      conversion_impact:
        '31% van Nederlanders gebruikt achteraf betalen, vooral in fashion (waar maat-onzekerheid speelt). Verlies geschat op 10-15% conversie in deze categorie.',
      recommendation:
        'Voeg Klarna of Riverty (voorheen AfterPay) toe. Kosten zijn 2-4% per transactie, maar de extra conversie compenseert dit ruimschoots. Vooral in fashion essentieel: klanten willen passen voor betalen.',
      microcopy_suggestion:
        "Voeg toe naast iDEAL: 'Achteraf betalen via Klarna — pas eerst, betaal binnen 14 dagen'",
      principle: 'Risico-reductie bij maat-onzekerheid (fashion-specifiek)',
      sources: [
        {
          name: 'Klarna Research NL',
          type: 'nl_specific',
          detail: '31% van Nederlandse consumenten kiest voor achteraf betalen wanneer beschikbaar, met name in mode-categorieën.',
        },
        {
          name: 'Betaalvereniging Nederland',
          type: 'statistic',
          detail: 'Achteraf betalen groeit jaarlijks met 12% als betaalmethode in NL e-commerce.',
        },
      ],
    },
    {
      title: 'Productreviews verstopt onderaan',
      severity: 'high',
      category: 'Product Detail',
      description: 'Reviews staan ver onder de vouw, na specs en bezorginfo. Geen sterscore bij de productnaam.',
      conversion_impact:
        'Direct zichtbare reviews verhogen conversie met 12-18%. In fashion zelfs meer, omdat klanten reviews lezen over pasvorm.',
      recommendation:
        "Toon sterscore + aantal reviews direct onder de productnaam (zoals bol.com). Voeg een 'snelle review-samenvatting' boven de vouw: '★★★★☆ 4.3 uit 5 (124 reviews)'. Filter reviews op 'past klein/normaal/groot'.",
      microcopy_suggestion: "Boven productfoto: '★★★★☆ 4.3/5 — gebaseerd op 124 reviews — bekijk alles'",
      principle: 'Sociale validatie + maat-zekerheid bij fashion',
      sources: [
        {
          name: 'Baymard Institute - Product Page UX',
          type: 'research',
          detail: '95% van shoppers leest reviews vóór een aankoopbeslissing; sterscores boven de vouw verhogen klikgedrag met 35%.',
        },
        {
          name: 'Nielsen Norman Group - Social Proof',
          type: 'research',
          detail: 'Sociale validatie heeft de grootste impact bij producten met inherente onzekerheid (mode, beauty, electronics).',
        },
      ],
    },
    {
      title: 'Cookie-banner voldoet niet aan AVG',
      severity: 'high',
      category: 'Compliance',
      description:
        "De cookie-banner heeft een grote groene 'Accepteer alles' knop en een kleine grijze tekstlink 'Weigeren'. Dit is volgens AP niet conform AVG (equal prominence vereist).",
      conversion_impact:
        'Direct risico: AP-boete tot €20M of 4% jaaromzet. Indirecte impact: klanten die dit herkennen verliezen vertrouwen.',
      recommendation:
        "Maak 'Accepteer alle cookies' en 'Alleen noodzakelijke' visueel gelijkwaardig (zelfde grootte, kleur-intensiteit). Geen pre-checked vinkjes. Check de AP-richtlijn op autoriteitpersoonsgegevens.nl.",
      microcopy_suggestion: "Twee gelijkwaardige knoppen: 'Accepteer alle cookies' en 'Alleen noodzakelijk'",
      principle: 'AVG-conformiteit + vertrouwen',
      sources: [
        {
          name: 'Autoriteit Persoonsgegevens (AP)',
          type: 'guideline',
          detail: 'Richtlijn cookies: weigeren moet net zo eenvoudig zijn als accepteren — equal prominence vereist.',
        },
        {
          name: 'UX Magazine - Consent Fatigue',
          type: 'research',
          detail: 'Dark patterns in cookie-banners ondermijnen lange-termijn vertrouwen en zijn een vorm van non-consent.',
        },
      ],
    },
    {
      title: 'Maattabel niet vindbaar zonder klikken',
      severity: 'medium',
      category: 'Product Detail',
      description:
        "De maattabel zit verstopt achter een link 'Maatadvies' die niet opvalt. Voor fashion is dit de #1 reden voor retours.",
      conversion_impact:
        'Onduidelijke maten = onzekerheid bij koop, hogere retourpercentages (kost je €5-15 per retour) en lagere herhaalaankopen.',
      recommendation:
        "Plaats de maattabel als uitklapbaar element direct bij de maatkeuze. Voeg per maat een visuele indicator toe (XS/S/M/L met omgerekend in cm). Overweeg een 'Wat is mijn maat?' quiz.",
      microcopy_suggestion:
        "Inline link: 'Twijfel je over je maat? Bekijk de maattabel' (uitklapbaar, niet apart venster)",
      principle: 'Pre-aankoop onzekerheid reduceren',
      sources: [
        {
          name: 'Baymard Institute - Apparel Sizing',
          type: 'research',
          detail: 'Sizing-onduidelijkheid is verantwoordelijk voor 60% van mode-retouren — vooral kostbaar voor MKB-webshops.',
        },
        {
          name: 'Thuiswinkel.org Retour-onderzoek',
          type: 'nl_specific',
          detail: 'Gemiddelde retourkosten voor NL-fashion-webshops liggen tussen €5-15 per pakket, inclusief retourverwerking.',
        },
      ],
    },
  ],
  quick_wins: [
    'Plaats het Thuiswinkel Waarborg-logo (als je dit hebt) direct in de footer of bij checkout-button',
    "Voeg een balk toe bovenaan: 'Gratis verzending vanaf €50 · 30 dagen retour · Voor 22:00 besteld, morgen in huis'",
    'Verplaats reviews-score naar boven de vouw op de productpagina',
    'Maak gast-checkout zichtbaar als gelijkwaardige optie',
    "Pas cookie-banner aan: equal prominence voor 'Weigeren'",
  ],
  nl_specific_checks: {
    ideal_visible:
      "iDEAL is alleen in de footer zichtbaar en pas in de checkout. Plaats het iDEAL-logo prominenter, bijvoorbeeld naast de prijs op productpagina's en in het mandje. Het is voor Nederlanders een vertrouwenssignaal.",
    afterpay_klarna: 'Niet aanwezig. Voor fashion essentieel — voeg Klarna of Riverty toe.',
    free_shipping_communication:
      'Gratis verzending wordt alleen op de productpagina genoemd in kleine letters. Maak hier een topbar van, ook als USP.',
    trust_badges: 'Geen keurmerken of trust badges zichtbaar. Dit is de grootste conversie-killer voor onbekende webshops.',
    gdpr_cookies: "Niet conform AVG. 'Accepteer alle' is veel prominenter dan 'Weigeren'.",
  },
};
