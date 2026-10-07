import { useLiveQuery } from 'dexie-react-hooks';
import { profileSchema } from '@ebenezer/contracts';
import { db } from '@/db/database';

export function useStudentProfile() {
  return useLiveQuery(async () => {
    try {
      const [profile, completed, existingStone] = await Promise.all([
        db.preferences.get('profile'),
        db.preferences.get('onboardingComplete'),
        db.stones.limit(1).first(),
      ]);
      let parsed;
      try {
        parsed =
          typeof profile?.value === 'string'
            ? profileSchema.safeParse(JSON.parse(profile.value))
            : undefined;
      } catch {
        /* Ignore damaged optional preferences. */
      }
      const values = parsed?.success ? parsed.data : undefined;
      return {
        profile: values,
        complete: !!values || completed?.value === true || !!existingStone,
        failed: false,
      };
    } catch {
      return { profile: undefined, complete: true, failed: true };
    }
  });
}
