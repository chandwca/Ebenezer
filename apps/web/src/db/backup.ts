import { z } from 'zod';
import { reflectionSchema } from '@ebenezer/contracts';

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T12:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  });
export const backupSchema = z
  .object({
    format: z.literal('ebenezer-journal'),
    version: z.literal(1),
    exportedAt: z.iso.datetime(),
    stones: z
      .array(
        reflectionSchema.extend({
          id: z.uuid(),
          journalDate: date,
          createdAt: z.iso.datetime(),
          updatedAt: z.iso.datetime(),
        }),
      )
      .max(10000),
  })
  .strict()
  .refine(
    (backup) => new Set(backup.stones.map((stone) => stone.id)).size === backup.stones.length,
  );
export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
