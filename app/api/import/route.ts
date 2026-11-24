import { z } from 'zod';
import { authorize, HttpError } from '@/lib/server/auth';
import { body, failure } from '@/lib/server/http';
import { collect, validateUrl } from '@/lib/server/collector';
export async function POST(r: Request) {
  try {
    await authorize(r);
    const { url } = z.object({ url: z.string().url().max(2048) }).parse(await body(r));
    validateUrl(url);
    try {
      return Response.json(await collect(url));
    } catch (e) {
      throw new HttpError(422, e instanceof Error ? e.message : 'Coleta indisponível.');
    }
  } catch (e) {
    return failure(e);
  }
}
