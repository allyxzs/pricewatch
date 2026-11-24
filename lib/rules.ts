import { bestOffer, cost, FRESH_MS, type Product } from './model';
export const COOLDOWN_MS = 24 * 60 * 60 * 1000;
/** Unknown/unavailable quotes never rearm an already notified episode. */
export function alertDecision(
  p: Product,
  latched: boolean,
  lastAlert: string | null,
  now = Date.now(),
) {
  if (p.paused) return { notify: false, latched };
  const best = bestOffer(p, now);
  const value = best ? cost(best, p.includeShipping)! : null;
  const eligible = value !== null && value <= p.target;
  const complete =
    p.offers.length > 0 &&
    p.offers.every(
      (o) =>
        o.available &&
        !o.error &&
        o.checkedAt &&
        now - Date.parse(o.checkedAt) <= FRESH_MS &&
        cost(o, p.includeShipping) !== null,
    );
  if (!eligible) return { notify: false, latched: complete ? false : latched };
  const cooldown = lastAlert !== null && now - Date.parse(lastAlert) < COOLDOWN_MS;
  return { notify: !latched && !cooldown, latched, value, offer: best };
}
