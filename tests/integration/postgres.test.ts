import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { db } from '../../lib/server/db';
import { evaluateProduct } from '../../worker/monitor';
import { dispatch } from '../../worker/notify';
import { readState } from '../../lib/server/repository';
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl)
  throw new Error(
    'Defina TEST_DATABASE_URL para um banco de testes. A suíte cria um schema isolado.',
  );
const schema = 'pw_test_' + randomUUID().replaceAll('-', '');
const admin = new pg.Pool({ connectionString: testUrl });
const url = new URL(testUrl);
url.searchParams.set('options', `-c search_path=${schema}`);
process.env.DATABASE_URL = url.toString();
const realFetch = globalThis.fetch;
before(async () => {
  await admin.query(`CREATE SCHEMA ${schema}`);
  await db().query(await readFile(new URL('../../db/001_initial.sql', import.meta.url), 'utf8'));
});
after(async () => {
  globalThis.fetch = realFetch;
  await db().end();
  await admin.query(`DROP SCHEMA ${schema} CASCADE`);
  await admin.end();
});
beforeEach(async () => {
  globalThis.fetch = realFetch;
  await db().query('DELETE FROM products');
  await db().query(
    "UPDATE settings SET email='test@example.com',email_enabled=true,telegram_enabled=false,telegram_chat_id='123'",
  );
});
async function seed(price = 10000) {
  const id = randomUUID(),
    oid = randomUUID();
  await db().query("INSERT INTO products(id,name,target) VALUES($1,'Produto de teste',10000)", [
    id,
  ]);
  await db().query(
    "INSERT INTO offers(id,product_id,store,url,price,shipping,available,checked_at) VALUES($1,$2,'Amazon','https://www.amazon.com.br/dp/TEST',$3,0,true,now())",
    [oid, id, price],
  );
  return { id, oid };
}
test('concurrent evaluation creates exactly one event per channel', async () => {
  const { id } = await seed();
  await Promise.all(Array.from({ length: 8 }, () => evaluateProduct(id)));
  const state = await readState();
  assert.equal(state.alerts.length, 1);
  assert.equal(state.products.length, 1);
  assert.equal(state.alerts[0].price, 10000);
});
test('rearms only on validated increase, then observes 24h cooldown', async () => {
  const { id, oid } = await seed();
  await evaluateProduct(id);
  await db().query('UPDATE offers SET price=11000 WHERE id=$1', [oid]);
  await evaluateProduct(id);
  await db().query('UPDATE offers SET price=9000 WHERE id=$1', [oid]);
  await evaluateProduct(id);
  assert.equal((await readState()).alerts.length, 1);
  await db().query("UPDATE products SET last_alert=now()-interval '25 hours' WHERE id=$1", [id]);
  await evaluateProduct(id);
  assert.equal((await readState()).alerts.length, 2);
});
test('delivery uses fixed event idempotency key and marks sent', async () => {
  const { id } = await seed();
  await evaluateProduct(id);
  process.env.RESEND_API_KEY = 'test-key';
  process.env.RESEND_FROM = 'PriceWatch <test@example.com>';
  const keys: string[] = [];
  globalThis.fetch = async (_url, init) => {
    keys.push((init?.headers as Record<string, string>)['Idempotency-Key']);
    return Response.json({ id: 'test-delivery' });
  };
  await dispatch();
  await dispatch();
  assert.equal(keys.length, 1);
  assert.ok(keys[0].startsWith('pricewatch-'));
  assert.equal((await readState()).alerts[0].status, 'sent');
});
test('paused product cancels a queued alert before sending', async () => {
  const { id } = await seed();
  await evaluateProduct(id);
  await db().query('UPDATE products SET paused=true WHERE id=$1', [id]);
  globalThis.fetch = async () => {
    throw new Error('MUST NOT SEND');
  };
  await dispatch();
  assert.equal((await readState()).alerts[0].status, 'cancelled');
});
test('email retries keep the same key', async () => {
  const { id } = await seed();
  await evaluateProduct(id);
  process.env.RESEND_API_KEY = 'test-key';
  process.env.RESEND_FROM = 'test@example.com';
  const keys: string[] = [];
  globalThis.fetch = async (_u, init) => {
    keys.push((init?.headers as Record<string, string>)['Idempotency-Key']);
    return new Response('', { status: 503 });
  };
  await dispatch();
  await db().query('UPDATE notifications SET next_attempt_at=now()');
  await dispatch();
  assert.equal(keys.length, 2);
  assert.equal(keys[0], keys[1]);
  assert.equal((await readState()).alerts[0].status, 'pending');
});
test('ambiguous Telegram delivery requires review instead of retry', async () => {
  await db().query('UPDATE settings SET email_enabled=false,telegram_enabled=true');
  const { id } = await seed();
  await evaluateProduct(id);
  process.env.TELEGRAM_BOT_TOKEN = 'test-token';
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    throw new Error('Timeout');
  };
  await dispatch();
  await dispatch();
  assert.equal(calls, 1);
  assert.equal((await readState()).alerts[0].status, 'uncertain');
});
test('changing recipient cancels stale queued message', async () => {
  const { id } = await seed();
  await evaluateProduct(id);
  await db().query("UPDATE settings SET email='other@example.com'");
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return Response.json({ id: 'x' });
  };
  await dispatch();
  assert.equal(calls, 0);
  assert.equal((await readState()).alerts[0].status, 'cancelled');
});
test('deletion cascades offers, samples and outbox', async () => {
  const { id, oid } = await seed();
  await db().query('INSERT INTO price_samples(offer_id,price,available) VALUES($1,10000,true)', [
    oid,
  ]);
  await evaluateProduct(id);
  await db().query('DELETE FROM products WHERE id=$1', [id]);
  for (const table of ['offers', 'price_samples', 'notifications'])
    assert.equal(
      (await db().query(`SELECT count(*)::int AS count FROM ${table}`)).rows[0].count,
      0,
    );
});
