import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { db } from '../lib/server/db';
import { scan } from './monitor';
import { dispatch } from './notify';
if (process.env.DEMO_MODE !== 'false')
  throw new Error('O worker requer DEMO_MODE=false. A demonstração não faz coletas nem envios.');
const hours = Number(process.env.CHECK_INTERVAL_HOURS || 3);
if (!Number.isFinite(hours) || hours < 1 || hours > 6)
  throw new Error('CHECK_INTERVAL_HOURS deve estar entre 1 e 6.');
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});
const queue = new Queue('pricewatch', { connection });
await queue.setGlobalConcurrency(1);
await queue.upsertJobScheduler(
  'collect',
  { every: hours * 3600000 },
  {
    name: 'collect',
    data: {},
    opts: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 30000 },
      removeOnComplete: 100,
      removeOnFail: 100,
    },
  },
);
await queue.upsertJobScheduler(
  'deliver',
  { every: 60000 },
  { name: 'deliver', data: {}, opts: { removeOnComplete: 100, removeOnFail: 100 } },
);
const worker = new Worker(
  'pricewatch',
  async (job) => {
    if (job.name === 'collect') await scan();
    await dispatch();
  },
  { connection, concurrency: 1 },
);
worker.on('failed', (job) =>
  console.error(`Job ${job?.name} falhou; consulte banco e conectividade.`),
);
console.log(`PriceWatch: coleta a cada ${hours}h; entrega a cada minuto.`);
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  await worker.close();
  await queue.close();
  await connection.quit();
  await db().end();
}
process.on('SIGTERM', () => void close());
process.on('SIGINT', () => void close());
