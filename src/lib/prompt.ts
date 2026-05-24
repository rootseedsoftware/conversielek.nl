// Bouwt de audit-prompt voor Claude. Gescheiden van de view zodat we 'm
// later kunnen testen en eventueel A/B'en zonder de UI te raken.

import { flowTypes, type FlowType } from '@/lib/data/flow-types';
import { productCategories } from '@/lib/data/categories';

export type PromptInput = {
  flowType: FlowType['value'];
  webshopName: string;
  webshopUrl: string;
  productCategory: string;
  targetAudience: string;
  currentChallenge: string;
};

function getFlowSpecificContext(flowType: FlowType['value']): string {
  const flow = flowTypes.find((f) => f.value === flowType)!;
  return `FOCUS VAN DEZE AUDIT: ${flow.label.toUpperCase()}
Beschrijving: ${flow.desc}

SPECIFIEKE HEURISTIEKEN VOOR DEZE FLOW (Nederlandse webshop-conventies):
${flow.heuristics.map((h, i) => `${i + 1}. ${h}`).join('\n')}

NEDERLANDSE WEBSHOP BENCHMARKS:
Vergelijk met de patronen van succesvolle Nederlandse webshops zoals bol.com, Coolblue, Wehkamp en HEMA in dit type flow. Wat doen zij goed dat hier ontbreekt?

NEDERLANDSE BETAALMETHODEN & CONVENTIES:
- iDEAL is dé verwachte betaalmethode (60%+ van NL betalingen)
- Achteraf betalen (Klarna, Riverty/AfterPay) is essentieel voor conversie
- Apple Pay/Google Pay verwacht op mobile
- Gratis verzending boven €X is standaard verwachting
- 14 dagen bedenktijd / retour wettelijk verplicht (vermelden vergroot vertrouwen)
- Thuiswinkel Waarborg / Webwinkel Keurmerk verhoogt vertrouwen
- Reviews via Kiyoh, Trustpilot, Google zichtbaar maken

AVG/COOKIE-COMPLIANCE:
Cookie-banner moet voldoen aan AVG: equal-prominence weigeren, geen pre-checked vinkjes, duidelijke uitleg.

NEDERLANDSE MICROCOPY:
Geef ALTIJD concrete Nederlandse microcopy-suggesties waar van toepassing. Voorbeelden van do/don't:
- "In winkelmandje" ✓ vs "Add to cart" ✗
- "Doorgaan naar betalen" ✓ vs "Bestel nu" (te agressief)
- "Bekijk product" ✓ vs "Klik hier"
- "Gratis verzending vanaf €50" ✓ (concreet) vs "Voordelige verzending" ✗ (vaag)
- "Bedankt voor je bestelling" ✓ vs "Order placed" ✗`;
}

export function buildAuditPrompt(input: PromptInput): string {
  const flow = flowTypes.find((f) => f.value === input.flowType)!;
  const categoryLabel = productCategories.find((p) => p.value === input.productCategory)?.label ?? input.productCategory;

  return `Je bent een senior UX/CRO-expert gespecialiseerd in Nederlandse webshops. Je doet een conversie-gerichte UX-audit voor een Nederlandse webshop-eigenaar.

WEBSHOP INFORMATIE:
${input.webshopName ? `Naam: ${input.webshopName}` : ''}
${input.webshopUrl ? `URL: ${input.webshopUrl}` : ''}
Productcategorie: ${categoryLabel}
${input.targetAudience ? `Doelgroep: ${input.targetAudience}` : ''}
${input.currentChallenge ? `Huidige uitdaging volgens eigenaar: ${input.currentChallenge}` : ''}

${getFlowSpecificContext(input.flowType)}

EVALUATIE-APPROACH:
- Wees commercieel, niet alleen UX-theoretisch. Webshop-eigenaren denken in omzet en conversie.
- Vertaal UX-problemen naar concrete impact: "kost je naar schatting X% conversie", "zorgt voor cart abandonment", "vermindert AOV"
- Geef altijd concrete Nederlandse microcopy als dat relevant is
- Vergelijk waar zinvol met wat bol.com/Coolblue/Wehkamp doen
- Wees pragmatisch (Steve Krug stijl): direct, no nonsense, actionable

BESCHIKBARE BRONNEN VOOR TRACEERBAARHEID:
Bij elk issue: geef minimaal 1 bron uit deze lijst die het issue ondersteunt. Kies de meest relevante.

Boeken & frameworks:
- "Don't Make Me Think" (Steve Krug) — usability principes, krug-test, scanning
- "Rocket Surgery Made Easy" (Steve Krug) — usability testing
- Nielsen's 10 Usability Heuristics (NN/g) — klassieke usability
- "Designing for the Digital Age" (Kim Goodwin) — interactiedesign

Research-bronnen:
- Baymard Institute — 200.000+ uur e-commerce research, checkout, productpagina, mobiele commerce
- Nielsen Norman Group (NN/g) — UX research artikelen
- UX Magazine (uxmag.com) — UX design artikelen, ethical UX, dark patterns
- Smashing Magazine — front-end & UX best practices

Statistieken & Nederlandse bronnen:
- Thuiswinkel.org — NL consumentengedrag, keurmerk-vertrouwen
- CBS — Nederlandse e-commerce cijfers
- Klarna research — payment behavior NL
- Autoriteit Persoonsgegevens (AP) — AVG/cookie-richtlijnen
- Webwinkel Vakdagen onderzoek — NL webshop trends

Standaarden:
- WCAG 2.1/2.2 — toegankelijkheid (criteria nummer specifiek noemen, bv. WCAG 1.4.3)
- AVG/GDPR artikelen — privacy compliance
- Wet koop op afstand — wettelijk verplichte retourrechten

INSTRUCTIES:
Analyseer de bijgevoegde screenshot(s) zorgvuldig. Beschrijf wat je daadwerkelijk ziet (kleuren, posities, teksten).
Focus op de gekozen flow: ${flow.label}.

Geef je antwoord ALLEEN als geldige JSON (geen markdown, geen tekst eromheen):

{
  "overall_score": 6.8,
  "conversion_impact_estimate": "Een ruwe schatting in zinnen: 'Met de gevonden issues laat deze webshop naar schatting 15-25% potentiele conversie liggen.'",
  "summary": "2-3 zinnen samenvatting in commerciële taal voor de eigenaar",
  "trust_score": 7,
  "trust_assessment": "Hoe goed bouwt deze webshop vertrouwen op (keurmerken, reviews, retourbeleid, betaalmethoden)?",
  "dutch_benchmarks": [
    {
      "what": "Wat doet een Nederlandse benchmark beter",
      "example_shop": "bol.com / Coolblue / Wehkamp",
      "why": "Waarom dit werkt"
    }
  ],
  "strengths": [
    "Concreet sterk punt 1 (commercieel relevant)",
    "Sterk punt 2",
    "Sterk punt 3"
  ],
  "issues": [
    {
      "title": "Korte directe titel",
      "severity": "critical",
      "category": "Trust / Checkout / Microcopy / Mobile / etc",
      "description": "Wat je ziet en waarom problematisch (commercieel framework)",
      "conversion_impact": "Concrete commerciële impact: 'kost X% conversie', 'verhoogt cart abandonment', etc",
      "recommendation": "Concrete actionable aanbeveling die een developer/designer morgen kan uitvoeren",
      "microcopy_suggestion": "Indien relevant: huidige tekst vs voorgestelde Nederlandse tekst. Anders null.",
      "principle": "Onderliggende UX/CRO principe waarop dit gebaseerd is",
      "sources": [
        {
          "name": "Naam van de bron (bv. 'Baymard Institute', 'Steve Krug - Don't Make Me Think', 'Thuiswinkel.org', 'WCAG 2.1 1.4.3')",
          "type": "research / book / statistic / guideline / nl_specific",
          "detail": "Specifiek wat de bron zegt (1 zin), bv. 'Baymard onderzoek toont 49% cart abandonment door onverwachte verzendkosten'"
        }
      ]
    }
  ],
  "quick_wins": [
    "Concrete verbetering 1 (binnen 1 uur)",
    "Concrete verbetering 2",
    "Concrete verbetering 3"
  ],
  "nl_specific_checks": {
    "ideal_visible": "Is iDEAL prominent zichtbaar als betaalmethode? Beoordeling.",
    "afterpay_klarna": "Is achteraf betalen via Klarna/Riverty/AfterPay aanwezig?",
    "free_shipping_communication": "Wordt gratis verzending duidelijk gecommuniceerd (en vanaf welk bedrag)?",
    "trust_badges": "Thuiswinkel Waarborg / Webwinkel Keurmerk / reviews zichtbaar?",
    "gdpr_cookies": "Voldoet de cookie-banner aan AVG (equal prominence weigeren)?"
  }
}

Severity: critical/high/medium/low. Geef 5-10 issues. Schrijf in het Nederlands met commerciële focus.`;
}
