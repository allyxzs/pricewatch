import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { db } from './db';
export const isDemo = () => process.env.DEMO_MODE !== 'false';
export function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('SESSION_SECRET deve ter pelo menos 32 caracteres.');
  return s;
}
export function equal(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function token(now = Date.now()) {
  const exp = String(now + 7 * 86400000);
  return `${exp}.${createHmac('sha256', secret()).update(exp).digest('hex')}`;
}
export function validToken(value: string, now = Date.now()) {
  const [exp, sig] = value.split('.');
  if (!/^\d{13}$/.test(exp || '') || !sig || Number(exp) <= now || Number(exp) > now + 7 * 86400000)
    return false;
  return equal(sig, createHmac('sha256', secret()).update(exp).digest('hex'));
}
export async function authorize(request?: Request) {
  if (isDemo()) throw new HttpError(409, 'O modo demonstração usa somente dados locais.');
  if (request && !['GET', 'HEAD'].includes(request.method)) checkOrigin(request);
  const value = (await cookies()).get('pw_session')?.value;
  if (!value || !validToken(value)) throw new HttpError(401, 'Entre para continuar.');
}
export function checkOrigin(r: Request) {
  const expected = new URL(process.env.APP_URL || 'http://localhost:3000').origin;
  if (r.headers.get('origin') !== expected) throw new HttpError(403, 'Origem não autorizada.');
}
export class HttpError extends Error {
  constructor(
    public code: number,
    message: string,
  ) {
    super(message);
  }
}
export async function limitedLogin() {
  const { rows } = await db().query(
    `INSERT INTO login_limit(id,started_at,attempts) VALUES(1,now(),1) ON CONFLICT(id) DO UPDATE SET attempts=CASE WHEN login_limit.started_at<now()-interval '15 minutes' THEN 1 ELSE login_limit.attempts+1 END, started_at=CASE WHEN login_limit.started_at<now()-interval '15 minutes' THEN now() ELSE login_limit.started_at END RETURNING attempts`,
  );
  if (rows[0].attempts > 20) throw new HttpError(429, 'Muitas tentativas. Aguarde 15 minutos.');
}
