import { test } from 'node:test';
import assert from 'node:assert/strict';
import { demoState } from '../lib/demo';
import { alertDecision, COOLDOWN_MS } from '../lib/rules';
import { bestOffer, cost, cents, FRESH_MS, status } from '../lib/model';
const now = Date.now();
function product(price = 10000) {
  const p = demoState().products[0];
  p.target = 10000;
  p.offers = p.offers.slice(0, 1);
  p.offers[0].price = price;
  p.offers[0].checkedAt = new Date(now).toISOString();
  return p;
}
test('ignores every price above target', () => {
  for (const price of [10001, 10100, 20000])
    assert.equal(alertDecision(product(price), false, null, now).notify, false);
});
test('equality qualifies for first notification', () =>
  assert.equal(alertDecision(product(), false, null, now).notify, true));
test('an even lower price in same episode does not notify again', () =>
  assert.equal(alertDecision(product(7000), true, null, now).notify, false));
test('a valid price above target rearms', () =>
  assert.equal(alertDecision(product(10001), true, null, now).latched, false));
test('24h cooldown suppresses oscillations', () =>
  assert.equal(
    alertDecision(product(), false, new Date(now - COOLDOWN_MS + 1).toISOString(), now).notify,
    false,
  ));
test('at 24h a new crossing becomes eligible', () =>
  assert.equal(
    alertDecision(product(), false, new Date(now - COOLDOWN_MS).toISOString(), now).notify,
    true,
  ));
test('paused product neither alerts nor rearms', () => {
  const p = product();
  p.paused = true;
  assert.deepEqual(alertDecision(p, true, null, now), { notify: false, latched: true });
});
test('stale quotes never trigger or rearm', () => {
  const p = product();
  p.offers[0].checkedAt = new Date(now - FRESH_MS - 1).toISOString();
  assert.equal(alertDecision(p, false, null, now).notify, false);
  assert.equal(alertDecision(p, true, null, now).latched, true);
});
test('unavailable prices do not rearm', () => {
  const p = product(20000);
  p.offers[0].available = false;
  assert.equal(alertDecision(p, true, null, now).latched, true);
});
test('collector failure invalidates quote', () => {
  const p = product();
  p.offers[0].error = 'HTTP 403';
  assert.equal(bestOffer(p, now), undefined);
});
test('total mode requires known shipping', () => {
  const p = product();
  p.includeShipping = true;
  p.offers[0].shipping = null;
  assert.equal(status(p, now), 'unknown');
  assert.equal(alertDecision(p, false, null, now).notify, false);
});
test('shipping can make a product ineligible', () => {
  const p = product(9500);
  p.includeShipping = true;
  p.offers[0].shipping = 1000;
  assert.equal(alertDecision(p, false, null, now).notify, false);
});
test('free shipping is known shipping', () =>
  assert.equal(cost({ price: 1000, shipping: 0 }, true), 1000));
test('best store uses total rather than sticker price', () => {
  const p = product(9500);
  p.includeShipping = true;
  p.offers[0].shipping = 1000;
  p.offers.push({ ...p.offers[0], id: 'other', price: 9900, shipping: 0 });
  assert.equal(bestOffer(p, now)?.id, 'other');
});
test('partial failure does not rearm an active episode', () => {
  const p = product(20000);
  p.offers.push({ ...p.offers[0], id: 'failed', error: 'Timeout' });
  assert.equal(alertDecision(p, true, null, now).latched, true);
});
test('empty offers never produce an alert', () => {
  const p = product();
  p.offers = [];
  assert.equal(alertDecision(p, false, null, now).notify, false);
});
test('Brazilian amounts are integer cents', () => {
  assert.equal(cents('1.500,99'), 150099);
  assert.equal(cents('0,01'), 1);
  assert.equal(cents('1500.99'), 150099);
});
test('rejects invalid and non-positive amounts', () => {
  for (const v of ['0', '-5', 'abc', 'NaN', '1.001', '1,999', '999999999999'])
    assert.throws(() => cents(v));
});
