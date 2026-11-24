import { cookies } from 'next/headers';
import { isDemo, checkOrigin, equal, token, limitedLogin, HttpError } from '@/lib/server/auth';
import { body, failure } from '@/lib/server/http';
export async function POST(r: Request) {
  try {
    if (isDemo()) throw new HttpError(409, 'A demonstração não precisa de login.');
    checkOrigin(r);
    await limitedLogin();
    const data = await body(r);
    const password = process.env.OWNER_PASSWORD;
    if (!password || password.length < 16)
      throw new HttpError(503, 'Configure uma senha de pelo menos 16 caracteres.');
    if (typeof data?.password !== 'string' || !equal(data.password, password))
      throw new HttpError(401, 'Senha incorreta.');
    (await cookies()).set('pw_session', token(), {
      httpOnly: true,
      secure: new URL(process.env.APP_URL || 'http://localhost:3000').protocol === 'https:',
      sameSite: 'strict',
      path: '/',
      maxAge: 604800,
    });
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(r: Request) {
  try {
    checkOrigin(r);
    (await cookies()).delete('pw_session');
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
