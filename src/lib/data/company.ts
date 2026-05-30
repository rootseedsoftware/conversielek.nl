// Bedrijfsgegevens — één bron van waarheid voor alle juridische pagina's,
// e-mailfooters, en contact-links. Pas hier de placeholders aan met je
// echte KvK + adres + contact zodra je die hebt. Wijzigingen propageren
// automatisch door /privacy, /algemene-voorwaarden, cookie-banner etc.

export const company = {
  // Wettelijke naam zoals ingeschreven bij KvK
  legalName: 'TROFSOF Group B.V.',
  // Handelsnaam (de naam waaronder je naar buiten treedt)
  tradeName: 'Conversielek',
  // Domein zonder protocol
  domain: 'conversielek.nl',
  // Volledige URL
  url: 'https://conversielek.nl',

  kvk: '95131396',
  btw: 'NL867014064B01',

  // Vestigingsadres
  address: {
    street: 'Goeman Borgesiuslaan 77',
    postalCode: '3515 ET',
    city: 'Utrecht',
    country: 'Nederland',
  },

  // Contact — alles loopt voorlopig naar het gmail-adres tot we
  // info@/support@/privacy@/legal@ aliases bij Hostnet hebben opgezet.
  // De aparte keys blijven bestaan zodat we per use-case kunnen
  // splitsen zodra de aliases er zijn, zonder de juridische pagina's
  // opnieuw te hoeven aanraken.
  email: {
    general: 'rootseedsoftware@gmail.com',
    support: 'rootseedsoftware@gmail.com',
    privacy: 'rootseedsoftware@gmail.com',
    legal: 'rootseedsoftware@gmail.com',
  },

  // Datum van laatste juridische update — handmatig bumpen bij wijzigingen
  // aan privacy of AV zodat gebruikers zien dat er iets veranderd is.
  legalUpdatedAt: '2026-05-30',
} as const;
