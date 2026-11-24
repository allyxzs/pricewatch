import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseProduct, publicAddress, validateUrl } from '../lib/server/collector';
const offer = {
  '@type': 'Offer',
  price: '1999.90',
  priceCurrency: 'BRL',
  availability: 'https://schema.org/InStock',
};
const product = { '@type': 'Product', name: 'Produto de teste', offers: offer };
const html = (value: unknown) =>
  `<html><script type="application/ld+json">${JSON.stringify(value)}</script></html>`;
test('parses one unambiguous BRL offer', () =>
  assert.deepEqual(parseProduct(html(product)), {
    name: 'Produto de teste',
    price: 199990,
    available: true,
  }));
test('supports JSON-LD @graph and array types', () =>
  assert.equal(
    parseProduct(html({ '@graph': [{ ...product, '@type': ['Product', 'Thing'] }] })).price,
    199990,
  ));
test('out of stock is explicit', () =>
  assert.equal(
    parseProduct(
      html({ ...product, offers: { ...offer, availability: 'https://schema.org/OutOfStock' } }),
    ).available,
    false,
  ));
test('rejects currency guessing, zero and unknown availability', () => {
  for (const change of [
    { priceCurrency: 'USD' },
    { priceCurrency: undefined },
    { price: '0' },
    { price: '1.234,56' },
    { availability: undefined },
  ])
    assert.throws(() => parseProduct(html({ ...product, offers: { ...offer, ...change } })));
});
test('rejects aggregate minima and ambiguous recommendations', () => {
  assert.throws(() =>
    parseProduct(
      html({
        ...product,
        offers: { '@type': 'AggregateOffer', lowPrice: '5', priceCurrency: 'BRL' },
      }),
    ),
  );
  assert.throws(() => parseProduct(html([product, product])));
  assert.throws(() => parseProduct(html({ ...product, offers: [offer, offer] })));
});
test('blocked page creates no fake quote', () =>
  assert.throws(() => parseProduct('<html>Confirme que você é humano</html>')));
test('URL allowlist matches exact hostname', () => {
  for (const value of [
    'http://www.amazon.com.br/a',
    'https://amazon.com.br.evil.test/a',
    'https://evil.amazon.com.br/a',
    'https://127.0.0.1/a',
    'https://www.amazon.com.br:8443/a',
    'https://user:pass@www.amazon.com.br/a',
    'file:///etc/passwd',
  ])
    assert.throws(() => validateUrl(value));
  assert.equal(validateUrl('https://www.amazon.com.br/dp/TEST#fragment').url.hash, '');
});
test('rejects private, reserved, mapped and loopback addresses', () => {
  for (const ip of [
    '127.0.0.1',
    '10.0.0.1',
    '169.254.169.254',
    '192.168.1.1',
    '172.16.0.1',
    '::1',
    '::ffff:127.0.0.1',
    'fc00::1',
    'fe80::1',
    '0.0.0.0',
  ])
    assert.equal(publicAddress(ip), false, ip);
  assert.equal(publicAddress('8.8.8.8'), true);
});
