import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { spawn, type ChildProcess } from 'node:child_process';
import pg from 'pg';
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl)
  throw new Error('Defina TEST_DATABASE_URL para os testes. Execute npm run build antes.');
const schema = 'pw_api_' + randomUUID().replaceAll('-', '');
const admin = new pg.Pool({ connectionString: testUrl });
const url = new URL(testUrl);
url.searchParams.set('options', `-c search_path=${schema}`);
const pool = new pg.Pool({ connectionString: url.toString() });
const origin = 'http://127.0.0.1:3101';
const password = 'only-for-automated-tests-123456';
let server: ChildProcess;
let cookie = '';
before(async () => {
  await admin.query(`CREATE SCHEMA ${schema}`);
  await pool.query(await readFile(new URL('../../db/001_initial.sql', import.meta.url), 'utf8'));
  server = spawn(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3101'],
    {
      env: {
        ...process.env,
        DEMO_MODE: 'false',
        DATABASE_URL: url.toString(),
        APP_URL: origin,
        OWNER_PASSWORD: password,
        SESSION_SECRET: 'test-only-session-secret-at-least-32-characters',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('API test server did not start. Run npm run build.')),
      20000,
    );
    server.stdout?.on('data', (data) => {
      if (data.toString().includes('Ready')) {
        clearTimeout(timer);
        resolve();
      }
    });
    server.on('exit', () => {
      clearTimeout(timer);
      reject(new Error('API test server exited.'));
    });
  });
});
after(async () => {
  if (server) {
    server.kill('SIGTERM');
    await new Promise<void>((resolve) => server.on('exit', () => resolve()));
  }
  await pool.end();
  await admin.query(`DROP SCHEMA ${schema} CASCADE`);
  await admin.end();
});
async function call(
  path: string,
  method = 'GET',
  data?: unknown,
  headers: Record<string, string> = {},
) {
  return fetch(origin + '/api/' + path, {
    method,
    headers: {
      Origin: origin,
      ...(cookie ? { Cookie: cookie } : {}),
      'Content-Type': 'application/json',
      ...headers,
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
}
test('HTTP authentication, CSRF and cookie configuration', async () => {
  assert.equal((await call('products')).status, 401);
  assert.equal(
    (await call('session', 'POST', { password }, { Origin: 'https://attacker.test' })).status,
    403,
  );
  assert.equal((await call('session', 'POST', { password: 'wrong' })).status, 401);
  const login = await call('session', 'POST', { password });
  assert.equal(login.status, 200);
  const setCookie = login.headers.get('set-cookie')!;
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=strict/i);
  cookie = setCookie.split(';')[0];
  assert.equal((await call('products')).status, 200);
});
test('HTTP CRUD, offer deduplication and validation', async () => {
  const create = await call('products', 'POST', {
    name: 'API test',
    target: 10000,
    url: 'https://www.amazon.com.br/dp/TEST',
    shipping: null,
  });
  assert.equal(create.status, 201);
  const { id } = await create.json();
  assert.ok(id);
  const state = await (await call('products')).json();
  assert.equal(state.products.length, 1);
  assert.equal(state.products[0].offers[0].checkedAt, null);
  assert.equal((await call('products', 'PATCH', { id, target: 5000, paused: true })).status, 200);
  assert.equal((await call('products', 'PATCH', { id, target: -1 })).status, 400);
  assert.equal(
    (
      await call('offers', 'POST', {
        productId: id,
        url: 'https://www.amazon.com.br/dp/TEST',
        shipping: 0,
      })
    ).status,
    409,
  );
  assert.equal(
    (await call('offers', 'POST', { productId: id, url: 'https://127.0.0.1/private', shipping: 0 }))
      .status,
    400,
  );
  assert.equal((await call('products', 'DELETE', { id })).status, 200);
  assert.equal((await (await call('products')).json()).products.length, 0);
});
test('HTTP settings validation and body size limit', async () => {
  assert.equal(
    (
      await call('settings', 'PUT', {
        email: '',
        emailEnabled: true,
        telegramChatId: '',
        telegramEnabled: false,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call('settings', 'PUT', {
        email: 'test@example.com',
        emailEnabled: true,
        telegramChatId: '',
        telegramEnabled: false,
      })
    ).status,
    200,
  );
  assert.equal((await call('products', 'POST', { name: 'x'.repeat(17000) })).status, 413);
});
test('HTTP logout clears cookie', async () => {
  const r = await call('session', 'DELETE');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('set-cookie') || '', /Max-Age=0|1970/i);
  cookie = '';
  assert.equal((await call('products')).status, 401);
});
