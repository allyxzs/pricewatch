import { ZodError } from 'zod';
import { HttpError } from './auth';
export async function body(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'Corpo vazio.');
  const parts: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > 16_384) {
      await reader.cancel();
      throw new HttpError(413, 'Dados muito grandes.');
    }
    parts.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(parts).toString());
  } catch {
    throw new HttpError(400, 'JSON inválido.');
  }
}
export function failure(e: unknown) {
  if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.code });
  if (e instanceof ZodError)
    return Response.json({ error: e.issues[0]?.message || 'Dados inválidos.' }, { status: 400 });
  console.error(e instanceof Error ? e.message : 'Erro interno');
  return Response.json(
    { error: 'Não foi possível concluir. Verifique a configuração e tente novamente.' },
    { status: 500 },
  );
}
