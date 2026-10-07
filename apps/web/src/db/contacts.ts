import type { PrayerContact, PrayerContactValues } from '@ebenezer/contracts';
import { db, type JournalDatabase } from './database';
import { LOCAL_ACCOUNT } from './repositories';

/** People without an account. Phone numbers and emails stay on this device. */
export function contactsRepository(database: JournalDatabase = db) {
  const fields = (values: PrayerContactValues) => ({
    displayName: values.displayName.trim(),
    relationship: values.relationship.trim() || undefined,
    channel: values.channel as PrayerContact['channel'],
    phone: values.phone.trim() || undefined,
    email: values.email.trim() || undefined,
  });
  return {
    list: () =>
      database.prayerContacts.where('accountId').equals(LOCAL_ACCOUNT).sortBy('displayName'),
    async add(values: PrayerContactValues) {
      const now = new Date().toISOString();
      const contact: PrayerContact = {
        id: crypto.randomUUID(),
        accountId: LOCAL_ACCOUNT,
        ...fields(values),
        createdAt: now,
        updatedAt: now,
      };
      await database.prayerContacts.add(contact);
      return contact;
    },
    async update(id: string, values: PrayerContactValues) {
      // Replace the whole record so cleared optional fields are really removed.
      const existing = await database.prayerContacts.get(id);
      if (!existing) throw new Error('Contact not found');
      await database.prayerContacts.put({
        id,
        accountId: existing.accountId,
        createdAt: existing.createdAt,
        ...fields(values),
        updatedAt: new Date().toISOString(),
      });
    },
    remove: (id: string) => database.prayerContacts.delete(id),
  };
}
export const contacts = contactsRepository();
