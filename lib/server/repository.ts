import type { PoolClient } from 'pg';
import { db } from './db';
import type { State, Product, Settings } from '../model';
export async function readProducts(
  client: Pick<PoolClient, 'query'> = db(),
  id?: string,
): Promise<Product[]> {
  const p = await client.query(
    'SELECT * FROM products ' + (id ? 'WHERE id=$1 ' : '') + 'ORDER BY created_at DESC',
    id ? [id] : [],
  );
  if (!p.rows.length) return [];
  const ids = p.rows.map((r) => r.id);
  const o = await client.query(
    'SELECT * FROM offers WHERE product_id=ANY($1::uuid[]) ORDER BY store',
    [ids],
  );
  // At most 180 recent samples per offer; all samples remain stored in PostgreSQL.
  const h = await client.query(
    `SELECT s.*,o.id AS oid FROM offers o CROSS JOIN LATERAL (SELECT * FROM price_samples WHERE offer_id=o.id ORDER BY collected_at DESC LIMIT 180) s WHERE o.product_id=ANY($1::uuid[]) ORDER BY s.collected_at`,
    [ids],
  );
  return p.rows.map((r) => ({
    id: r.id,
    name: r.name,
    kind: r.kind,
    target: r.target,
    includeShipping: r.include_shipping,
    paused: r.paused,
    offers: o.rows
      .filter((v) => v.product_id === r.id)
      .map((v) => ({
        id: v.id,
        store: v.store,
        url: v.url,
        price: v.price,
        shipping: v.shipping,
        available: v.available,
        checkedAt: v.checked_at?.toISOString() || null,
        error: v.error,
        history: h.rows
          .filter((s) => s.oid === v.id)
          .map((s) => ({
            at: s.collected_at.toISOString(),
            price: s.price,
            shipping: s.shipping,
            available: s.available,
          })),
      })),
  }));
}
export async function readSettings(client: Pick<PoolClient, 'query'> = db()): Promise<Settings> {
  const {
    rows: [s],
  } = await client.query('SELECT * FROM settings WHERE id=1');
  return {
    email: s.email,
    emailEnabled: s.email_enabled,
    telegramChatId: s.telegram_chat_id,
    telegramEnabled: s.telegram_enabled,
  };
}
export async function readState(): Promise<State> {
  const [products, settings, { rows }] = await Promise.all([
    readProducts(),
    readSettings(),
    db().query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100'),
  ]);
  return {
    products,
    settings,
    alerts: rows.map((a) => ({
      id: a.id,
      productId: a.product_id,
      name: a.name,
      price: a.price,
      at: a.created_at.toISOString(),
      channel: a.channel,
      status: a.status,
    })),
  };
}
