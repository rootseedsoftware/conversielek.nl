// Bedrijfsgegevens — één bron van waarheid voor alle juridische pagina's,
// e-mailfooters, en contact-links. Pas hier de placeholders aan met je
// echte KvK + adres + contact zodra je die hebt. Wijzigingen propageren
// automatisch door /privacy, /algemene-voorwaarden, cookie-banner etc.

export const company = {
  // Wettelijke naam zoals ingeschreven bij KvK
  legalName: 'Root Seed Software',
  // Handelsnaam (de naam waaronder je naar buiten treedt)
  tradeName: 'Conversielek',
  // Domein zonder protocol
  domain: 'conversielek.nl',
  // Volledige URL
  url: 'https://conversielek.nl',

  // ⚠️ INVULLEN ZODRA BESCHIKBAAR ⚠️
  kvk: 'INVULLEN', // bv. '12345678'
  btw: 'INVULLEN', // bv. 'NL123456789B01'

  // Vestigingsadres — INVULLEN
  address: {
    street: 'INVULLEN',
    postalCode: 'INVULLEN',
    city: 'INVULLEN',
    country: 'Nederland',
  },

  // Contact
  email: {
    general: 'info@conversielek.nl',
    support: 'support@conversielek.nl',
    privacy: 'privacy@conversielek.nl',
    legal: 'legal@conversielek.nl',
  },

  // Datum van laatste juridische update — handmatig bumpen bij wijzigingen
  // aan privacy of AV zodat gebruikers zien dat er iets veranderd is.
  legalUpdatedAt: '2026-05-26',
} as const;
