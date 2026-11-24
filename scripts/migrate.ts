import { readFile } from 'node:fs/promises';
import { db } from '../lib/server/db';
await db().query(await readFile(new URL('../db/001_initial.sql', import.meta.url), 'utf8'));
console.log('Banco de dados pronto.');
await db().end();
