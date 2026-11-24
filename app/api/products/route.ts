import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { authorize, HttpError } from '@/lib/server/auth';
import { body, failure } from '@/lib/server/http';
import { readState } from '@/lib/server/repository';
import { db, transaction } from '@/lib/server/db';
import { productSchema, editSchema } from '@/lib/validation';
import { validateUrl } from '@/lib/server/collector';
export async function GET() {
  try {
    await authorize();
    return Response.json(await readState(), { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(r: Request) {
  try {
    await authorize(r);
    const data = productSchema.parse(await body(r));
    const { url, store } = validateUrl(data.url);
    const id = randomUUID();
    await transaction(async (c) => {
      await c.query('SELECT pg_advisory_xact_lock(701)');
      const {
        rows: [{ count }],
      } = await c.query('SELECT count(*)::int FROM products');
      if (count >= 100) throw new HttpError(409, 'Limite de 100 produtos atingido.');
      await c.query(
        'INSERT INTO products(id,name,kind,target,include_shipping) VALUES($1,$2,$3,$4,$5)',
        [id, data.name, data.kind, data.target, data.includeShipping],
      );
      await c.query('INSERT INTO offers(id,product_id,store,url,shipping) VALUES($1,$2,$3,$4,$5)', [
        randomUUID(),
        id,
        store,
        url.toString(),
        data.shipping,
      ]);
    });
    return Response.json({ id }, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
export async function PATCH(r: Request) {
  try {
    await authorize(r);
    const v = editSchema.parse(await body(r));
    const result = await db().query(
      `UPDATE products SET target=COALESCE($2,target),paused=COALESCE($3,paused),include_shipping=COALESCE($4,include_shipping),latched=CASE WHEN ($2::int IS NOT NULL AND $2<>target) OR ($4::boolean IS NOT NULL AND $4<>include_shipping) THEN false ELSE latched END WHERE id=$1 RETURNING id`,
      [v.id, v.target ?? null, v.paused ?? null, v.includeShipping ?? null],
    );
    if (!result.rowCount) throw new HttpError(404, 'Produto não encontrado.');
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(r: Request) {
  try {
    await authorize(r);
    const { id } = z.object({ id: z.uuid() }).parse(await body(r));
    await db().query('DELETE FROM products WHERE id=$1', [id]);
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
