import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { authorize, HttpError } from '@/lib/server/auth';
import { body, failure } from '@/lib/server/http';
import { transaction } from '@/lib/server/db';
import { validateUrl } from '@/lib/server/collector';
export async function POST(r: Request) {
  try {
    await authorize(r);
    const v = z
      .object({
        productId: z.uuid(),
        url: z.string().url().max(2048),
        shipping: z.number().int().min(0).max(10_000_000).nullable(),
      })
      .parse(await body(r));
    const { url, store } = validateUrl(v.url);
    await transaction(async (c) => {
      const result = await c.query('SELECT id FROM products WHERE id=$1 FOR UPDATE', [v.productId]);
      if (!result.rowCount) throw new HttpError(404, 'Produto não encontrado.');
      const {
        rows: [{ count }],
      } = await c.query('SELECT count(*)::int FROM offers WHERE product_id=$1', [v.productId]);
      if (count >= 8) throw new HttpError(409, 'Limite de 8 ofertas por produto.');
      const inserted = await c.query(
        'INSERT INTO offers(id,product_id,store,url,shipping) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING id',
        [randomUUID(), v.productId, store, url.toString(), v.shipping],
      );
      if (!inserted.rowCount) throw new HttpError(409, 'Esta oferta já está cadastrada.');
    });
    return Response.json({ ok: true }, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(r: Request) {
  try {
    await authorize(r);
    const v = z.object({ id: z.uuid(), productId: z.uuid() }).parse(await body(r));
    await transaction(async (c) => {
      await c.query('SELECT id FROM products WHERE id=$1 FOR UPDATE', [v.productId]);
      await c.query('DELETE FROM offers WHERE id=$1 AND product_id=$2', [v.id, v.productId]);
    });
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
