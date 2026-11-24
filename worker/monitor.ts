import { randomUUID } from 'node:crypto';
import { db, transaction } from '../lib/server/db';
import { collect } from '../lib/server/collector';
import { readProducts, readSettings } from '../lib/server/repository';
import { alertDecision } from '../lib/rules';
export async function evaluateProduct(id: string) {
  await transaction(async (c) => {
    const {
      rows: [row],
    } = await c.query('SELECT * FROM products WHERE id=$1 FOR UPDATE', [id]);
    if (!row) return;
    const [p] = await readProducts(c, id);
    const decision = alertDecision(p, row.latched, row.last_alert?.toISOString() || null);
    if (decision.latched !== row.latched)
      await c.query('UPDATE products SET latched=$2 WHERE id=$1', [id, decision.latched]);
    if (!decision.notify || !decision.offer) return;
    const settings = await readSettings(c);
    const channels = [
      ...(settings.emailEnabled ? [{ channel: 'email', destination: settings.email }] : []),
      ...(settings.telegramEnabled
        ? [{ channel: 'telegram', destination: settings.telegramChatId }]
        : []),
    ];
    if (!channels.length) return;
    const episode = row.episode + 1;
    for (const ch of channels)
      await c.query(
        `INSERT INTO notifications(id,product_id,episode,name,price,target,url,channel,destination) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING`,
        [
          randomUUID(),
          id,
          episode,
          p.name,
          decision.value,
          p.target,
          decision.offer.url,
          ch.channel,
          ch.destination,
        ],
      );
    await c.query('UPDATE products SET latched=true,episode=$2,last_alert=now() WHERE id=$1', [
      id,
      episode,
    ]);
  });
}
export async function scan() {
  const { rows: products } = await db().query(
    'SELECT id FROM products WHERE paused=false ORDER BY created_at',
  );
  for (const product of products) {
    const { rows: offers } = await db().query('SELECT id,url FROM offers WHERE product_id=$1', [
      product.id,
    ]);
    for (const offer of offers) {
      try {
        const quote = await collect(offer.url);
        await transaction(async (c) => {
          const {
            rows: [p],
          } = await c.query('SELECT paused FROM products WHERE id=$1 FOR UPDATE', [product.id]);
          if (!p || p.paused) return;
          const {
            rows: [o],
          } = await c.query(
            'UPDATE offers SET price=$2,available=$3,checked_at=now(),error=null WHERE id=$1 RETURNING shipping',
            [offer.id, quote.price, quote.available],
          );
          if (!o) return;
          await c.query(
            'INSERT INTO price_samples(offer_id,price,shipping,available) VALUES($1,$2,$3,$4)',
            [offer.id, quote.price, o.shipping, quote.available],
          );
        });
      } catch (e) {
        await db().query('UPDATE offers SET error=$2 WHERE id=$1', [
          offer.id,
          e instanceof Error ? e.message.slice(0, 300) : 'Falha na coleta.',
        ]);
      }
    }
    await evaluateProduct(product.id);
  }
}
