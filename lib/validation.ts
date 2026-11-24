import { z } from 'zod';
export const priceSchema = z.number().int().min(1).max(100_000_000);
export const productSchema = z.object({
  name: z.string().trim().min(2).max(180),
  target: priceSchema,
  kind: z
    .enum(['headphones', 'console', 'coffee', 'phone', 'monitor', 'generic'])
    .default('generic'),
  includeShipping: z.boolean().default(false),
  url: z.string().url().max(2048),
  shipping: z.number().int().min(0).max(10_000_000).nullable().default(null),
});
export const settingsSchema = z
  .object({
    email: z.union([z.literal(''), z.email()]).default(''),
    emailEnabled: z.boolean(),
    telegramChatId: z.string().regex(/^(-?\d{1,20})?$/),
    telegramEnabled: z.boolean(),
  })
  .refine((v) => !v.emailEnabled || !!v.email, 'Informe o e-mail.')
  .refine((v) => !v.telegramEnabled || !!v.telegramChatId, 'Informe o Chat ID.');
export const editSchema = z.object({
  id: z.uuid(),
  target: priceSchema.optional(),
  paused: z.boolean().optional(),
  includeShipping: z.boolean().optional(),
});
