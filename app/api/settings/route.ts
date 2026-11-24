import { authorize } from '@/lib/server/auth';
import { body, failure } from '@/lib/server/http';
import { settingsSchema } from '@/lib/validation';
import { db } from '@/lib/server/db';
export async function PUT(r: Request) {
  try {
    await authorize(r);
    const s = settingsSchema.parse(await body(r));
    await db().query(
      'UPDATE settings SET email=$1,email_enabled=$2,telegram_chat_id=$3,telegram_enabled=$4 WHERE id=1',
      [s.email, s.emailEnabled, s.telegramChatId, s.telegramEnabled],
    );
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
