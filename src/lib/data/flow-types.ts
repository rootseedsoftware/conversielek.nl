import {
  Home,
  Package,
  ShoppingCart,
  CreditCard,
  Smartphone,
  type LucideIcon,
} from 'lucide-react';

export type FlowType = {
  value: 'homepage' | 'product' | 'cart' | 'checkout' | 'mobile';
  label: string;
  icon: LucideIcon;
  desc: string;
  heuristics: string[];
};

export const flowTypes: FlowType[] = [
  {
    value: 'homepage',
    label: 'Homepage',
    icon: Home,
    desc: "Eerste indruk, USP's, navigatie",
    heuristics: [
      'Direct duidelijke USP',
      'Gratis verzending zichtbaar',
      'Vertrouwenslabels (Thuiswinkel Waarborg)',
      'Zoekfunctie prominent',
      'Categorienavigatie',
      'Sale/aanbiedingen',
      'Reviews/sterren',
    ],
  },
  {
    value: 'product',
    label: 'Productpagina',
    icon: Package,
    desc: "Productinfo, foto's, reviews, CTA",
    heuristics: [
      "Productfoto's vanuit meerdere hoeken",
      'Prijs prominent + bij voorraad',
      'Maat/variant selectie',
      'Reviews + sterren',
      'Bezorginformatie',
      'Retourbeleid',
      'Productspecificaties',
      'CTA boven de vouw',
    ],
  },
  {
    value: 'cart',
    label: 'Winkelmandje',
    icon: ShoppingCart,
    desc: 'Cart, kortingscodes, doorgaan',
    heuristics: [
      'Productafbeelding zichtbaar',
      'Hoeveelheid aanpasbaar',
      'Verzendkosten transparant',
      'Kortingscode-veld',
      'Totaalbedrag duidelijk',
      'Doorgaan-CTA prominent',
      'Verder winkelen mogelijk',
      'Cross-sells',
    ],
  },
  {
    value: 'checkout',
    label: 'Checkout',
    icon: CreditCard,
    desc: 'Bestellen, betalen, AVG',
    heuristics: [
      'Gast-checkout mogelijk',
      'iDEAL als eerste optie',
      'Postcode-autocomplete',
      'Achteraf betalen aanwezig',
      'Geen onnodige velden',
      'Voortgangsindicator',
      'AVG/cookie-compliance',
      'Order-samenvatting zichtbaar',
    ],
  },
  {
    value: 'mobile',
    label: 'Mobile',
    icon: Smartphone,
    desc: 'Mobiele webshop-ervaring',
    heuristics: [
      'Touch targets ≥44px',
      'Sticky cart/CTA',
      'Geen horizontale scroll',
      'Snelle laadtijd',
      'Apple/Google Pay',
      'Eenhandig bedienbaar',
      'Zoekbalk toegankelijk',
      'Filter-UX op mobile',
    ],
  },
];
