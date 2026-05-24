export type ProductCategory = {
  value: string;
  label: string;
};

export const productCategories: ProductCategory[] = [
  { value: 'fashion', label: 'Mode & Kleding' },
  { value: 'electronics', label: 'Elektronica' },
  { value: 'home', label: 'Wonen & Tuin' },
  { value: 'beauty', label: 'Beauty & Persoonlijke verzorging' },
  { value: 'food', label: 'Food & Drinken' },
  { value: 'sports', label: 'Sport & Outdoor' },
  { value: 'kids', label: 'Baby, Kids & Speelgoed' },
  { value: 'health', label: 'Gezondheid & Supplementen' },
  { value: 'b2b', label: 'B2B / Zakelijk' },
  { value: 'other', label: 'Anders' },
];
