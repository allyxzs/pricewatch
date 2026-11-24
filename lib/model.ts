export type Kind = 'headphones' | 'console' | 'coffee' | 'phone' | 'monitor' | 'generic';
export type Sample = { at: string; price: number; shipping: number | null; available: boolean };
export type Offer = {
  id: string;
  store: string;
  url: string;
  price: number;
  shipping: number | null;
  available: boolean;
  checkedAt: string | null;
  error: string | null;
  history: Sample[];
};
export type Product = {
  id: string;
  name: string;
  kind: Kind;
  target: number;
  includeShipping: boolean;
  paused: boolean;
  offers: Offer[];
};
export type Settings = {
  email: string;
  emailEnabled: boolean;
  telegramChatId: string;
  telegramEnabled: boolean;
};
export type Alert = {
  id: string;
  productId: string;
  name: string;
  price: number;
  at: string;
  channel: string;
  status: string;
};
export type State = { products: Product[]; settings: Settings; alerts: Alert[] };
export const money = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
export function cost(
  offer: Pick<Offer, 'price' | 'shipping'>,
  includeShipping: boolean,
): number | null {
  return includeShipping
    ? offer.shipping === null
      ? null
      : offer.price + offer.shipping
    : offer.price;
}
export const FRESH_MS = 7 * 60 * 60 * 1000;
export function bestOffer(p: Product, now = Date.now()): Offer | undefined {
  return p.offers
    .filter(
      (o) =>
        o.available &&
        !o.error &&
        o.checkedAt &&
        now - Date.parse(o.checkedAt) <= FRESH_MS &&
        cost(o, p.includeShipping) !== null,
    )
    .sort((a, b) => cost(a, p.includeShipping)! - cost(b, p.includeShipping)!)[0];
}
export function status(
  p: Product,
  now = Date.now(),
): 'hit' | 'near' | 'above' | 'paused' | 'unknown' {
  if (p.paused) return 'paused';
  const offer = bestOffer(p, now);
  if (!offer) return 'unknown';
  const value = cost(offer, p.includeShipping)!;
  return value <= p.target ? 'hit' : value <= p.target * 1.1 ? 'near' : 'above';
}
export const statusLabels = {
  hit: 'Meta atingida',
  near: 'Quase lá',
  above: 'Acompanhando',
  paused: 'Pausado',
  unknown: 'Sem preço válido',
};
export function cents(input: string): number {
  const raw = input.trim().replace(/^R\$\s*/, '');
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized))
    throw new Error('Informe um valor válido, como 1.500,00.');
  const value = Math.round(Number(normalized) * 100);
  if (!Number.isSafeInteger(value) || value <= 0 || value > 100_000_000)
    throw new Error('O valor deve estar entre R$ 0,01 e R$ 1.000.000,00.');
  return value;
}
