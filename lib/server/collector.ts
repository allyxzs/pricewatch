import { request } from 'node:https';
import { lookup } from 'node:dns/promises';
import ipaddr from 'ipaddr.js';
import * as cheerio from 'cheerio';
import { HttpError } from './auth';
const STORES: Record<string, string> = {
  'amazon.com.br': 'Amazon',
  'www.amazon.com.br': 'Amazon',
  'magazineluiza.com.br': 'Magazine Luiza',
  'www.magazineluiza.com.br': 'Magazine Luiza',
  'mercadolivre.com.br': 'Mercado Livre',
  'www.mercadolivre.com.br': 'Mercado Livre',
  'produto.mercadolivre.com.br': 'Mercado Livre',
  'kabum.com.br': 'KaBuM!',
  'www.kabum.com.br': 'KaBuM!',
};
export function validateUrl(input: string) {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new HttpError(400, 'Link inválido.');
  }
  if (
    url.protocol !== 'https:' ||
    url.port ||
    url.username ||
    url.password ||
    !STORES[url.hostname]
  )
    throw new HttpError(
      400,
      'Use um link HTTPS completo da Amazon Brasil, Magalu, Mercado Livre ou KaBuM!.',
    );
  url.hash = '';
  return { url, store: STORES[url.hostname] };
}
export function publicAddress(address: string) {
  try {
    return ipaddr.parse(address).range() === 'unicast';
  } catch {
    return false;
  }
}
/** DNS is validated and pinned to the request, including TLS hostname verification. No redirects. */
async function html(input: string): Promise<string> {
  const { url } = validateUrl(input);
  const records = await lookup(url.hostname, { all: true });
  if (!records.length || records.some((r) => !publicAddress(r.address)))
    throw new Error('Endereço de rede não permitido.');
  const address = records.find((r) => r.family === 4) || records[0];
  return new Promise((resolve, reject) => {
    const req = request(
      url,
      {
        method: 'GET',
        agent: false,
        headers: {
          'User-Agent': 'PriceWatch/0.1 (+personal price monitoring)',
          Accept: 'text/html',
          'Accept-Encoding': 'identity',
        },
        lookup: (_host, options, cb) =>
          options.all
            ? cb(null, [{ address: address.address, family: address.family }])
            : cb(null, address.address, address.family),
      },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          reject(
            new Error(
              `Loja retornou HTTP ${res.statusCode}. Redirecionamentos e bloqueios não são contornados.`,
            ),
          );
          return;
        }
        if (!res.headers['content-type']?.includes('text/html')) {
          res.resume();
          reject(new Error('A loja não retornou uma página HTML.'));
          return;
        }
        let size = 0;
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => {
          size += chunk.length;
          if (size > 3_000_000) {
            req.destroy(new Error('Página maior que o limite.'));
            return;
          }
          chunks.push(chunk);
        });
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        res.on('error', reject);
      },
    );
    const timer = setTimeout(
      () => req.destroy(new Error('A loja não respondeu em 15 segundos.')),
      15_000,
    );
    req.on('close', () => clearTimeout(timer));
    req.on('error', reject);
    req.end();
  });
}
type Json = Record<string, unknown>;
const objects = (v: unknown): Json[] =>
  Array.isArray(v) ? v.flatMap(objects) : v && typeof v === 'object' ? [v as Json] : [];
const isType = (v: unknown, t: string) => v === t || (Array.isArray(v) && v.includes(t));
export function parseProduct(source: string) {
  const $ = cheerio.load(source);
  const products: Json[] = [];
  function visit(v: unknown) {
    for (const x of objects(v)) {
      if (isType(x['@type'], 'Product')) products.push(x);
      if (x['@graph']) visit(x['@graph']);
    }
  }
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      visit(JSON.parse($(el).text()));
    } catch {
      /* An unrelated malformed block cannot create a quote. */
    }
  });
  // Reject ambiguous pages: never use a recommendation, aggregate minimum or a variant's price.
  if (products.length !== 1)
    throw new Error('Não foi possível identificar um único produto no JSON-LD desta página.');
  const product = products[0];
  const offers = objects(product.offers);
  if (offers.length !== 1 || !isType(offers[0]['@type'], 'Offer'))
    throw new Error(
      'Oferta ambígua ou sem preço individual. Cadastre um link direto de uma variante.',
    );
  const o = offers[0];
  if (o.priceCurrency !== 'BRL') throw new Error('A oferta precisa ter moeda BRL explícita.');
  const raw = String(o.price ?? '');
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) throw new Error('Preço inválido ou ausente.');
  const price = Math.round(Number(raw) * 100);
  if (!Number.isSafeInteger(price) || price < 1 || price > 100_000_000)
    throw new Error('Preço fora dos limites aceitos.');
  const availability = String(o.availability || '')
    .split('/')
    .pop();
  if (!['InStock', 'OutOfStock', 'SoldOut', 'Discontinued'].includes(availability || ''))
    throw new Error('Disponibilidade desconhecida.');
  const name = String(product.name || '').trim();
  if (name.length < 2 || name.length > 180) throw new Error('Nome do produto inválido.');
  return { name, price, available: availability === 'InStock' };
}
export async function collect(url: string) {
  return { ...parseProduct(await html(url)), store: validateUrl(url).store };
}
