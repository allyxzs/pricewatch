import { db, transaction } from '../lib/server/db';
import { readProducts, readSettings } from '../lib/server/repository';
import { bestOffer, cost, money } from '../lib/model';
function configured(channel: string) {
  return channel === 'email'
    ? !!(process.env.RESEND_API_KEY && process.env.RESEND_FROM)
    : !!process.env.TELEGRAM_BOT_TOKEN;
}
export async function dispatch() {
  // A crashed Telegram send has no provider idempotency key. Prefer manual review to an automatic duplicate.
  await db().query(
    `UPDATE notifications SET status=CASE WHEN channel='telegram' THEN 'uncertain' ELSE 'pending' END,error='Envio interrompido; confirme a entrega antes de reenviar.' WHERE status='sending' AND next_attempt_at<now()-interval '5 minutes'`,
  );
  for (let i = 0; i < 100; i++) {
    const n = await transaction(async (c) => {
      const {
        rows: [n],
      } = await c.query(
        `SELECT * FROM notifications WHERE status='pending' AND next_attempt_at<=now() ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1`,
      );
      if (!n) return null;
      const [p] = await readProducts(c, n.product_id);
      const s = await readSettings(c);
      const offer = p && !p.paused ? bestOffer(p) : undefined;
      const active =
        n.channel === 'email'
          ? s.emailEnabled && s.email === n.destination
          : s.telegramEnabled && s.telegramChatId === n.destination;
      if (
        !active ||
        !offer ||
        cost(offer, p.includeShipping)! > p.target ||
        p.target !== n.target
      ) {
        await c.query("UPDATE notifications SET status='cancelled' WHERE id=$1", [n.id]);
        return { skip: true };
      }
      if (Date.now() - n.created_at.getTime() > 23 * 3600000) {
        await c.query("UPDATE notifications SET status='expired' WHERE id=$1", [n.id]);
        return { skip: true };
      }
      if (!configured(n.channel)) {
        await c.query(
          "UPDATE notifications SET error='Configure as credenciais do canal no servidor.',next_attempt_at=now()+interval '5 minutes' WHERE id=$1",
          [n.id],
        );
        return { skip: true };
      }
      await c.query(
        "UPDATE notifications SET status='sending',attempts=attempts+1,next_attempt_at=now() WHERE id=$1",
        [n.id],
      );
      return { ...n, skip: false };
    });
    if (!n) break;
    if (n.skip) continue;
    const text = `Sua meta foi atingida!\n\n${n.name}\nPreço coletado: ${money(n.price)}\nSua meta: ${money(n.target)}\n\n${n.url}\n\nConfira preço, frete e condições na loja antes de comprar.\nPriceWatch · Seu preço. Seu momento.`;
    try {
      const response =
        n.channel === 'email'
          ? await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
                'Idempotency-Key': `pricewatch-${n.id}`,
              },
              body: JSON.stringify({
                from: process.env.RESEND_FROM,
                to: [n.destination],
                subject: `Meta atingida: ${n.name}`,
                text,
              }),
              signal: AbortSignal.timeout(15000),
            })
          : await fetch(
              `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: n.destination,
                  text,
                  link_preview_options: { is_disabled: true },
                }),
                signal: AbortSignal.timeout(15000),
              },
            );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (n.channel === 'telegram' && !result.ok) throw new Error('Telegram recusou a mensagem.');
      await db().query(
        "UPDATE notifications SET status='sent',sent_at=now(),error=null WHERE id=$1",
        [n.id],
      );
    } catch {
      // Email retries use the same key inside Resend's 24-hour idempotency window.
      const state = n.channel === 'telegram' ? 'uncertain' : n.attempts >= 4 ? 'failed' : 'pending';
      await db().query(
        "UPDATE notifications SET status=$2,error='Falha na entrega. Verifique o provedor.',next_attempt_at=now()+interval '5 minutes' WHERE id=$1",
        [n.id, state],
      );
    }
  }
}
