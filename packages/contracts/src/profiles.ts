import { z } from 'zod';

const displayNameSchema = z.string().trim().min(1).max(120);
const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9_]{2,29}$/);

// Separate from the existing device-only name/city profile.
export const cloudProfileSchema = z.strictObject({
  id: z.uuid(),
  displayName: displayNameSchema,
  handle: handleSchema,
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});

export const updateCloudProfileSchema = z
  .strictObject({ displayName: displayNameSchema.optional(), handle: handleSchema.optional() })
  .refine((value) => value.displayName !== undefined || value.handle !== undefined, {
    message: 'Provide a display name or handle.',
  });

export const cloudProfileResponseSchema = z.strictObject({ profile: cloudProfileSchema });
export type CloudProfile = z.infer<typeof cloudProfileSchema>;
export type UpdateCloudProfile = z.infer<typeof updateCloudProfileSchema>;
