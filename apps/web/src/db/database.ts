import Dexie, { type EntityTable } from 'dexie';
import type { PrayerContact, ReflectionValues } from '@ebenezer/contracts';

export type Stone = ReflectionValues & {
  id: string;
  accountId: string;
  journalDate: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  version: number;
  syncState: 'local' | 'pending' | 'synced';
};
export type Draft = { id: string; values: ReflectionValues; step: number; updatedAt: string };
export type Preference = { key: string; value: string | boolean };
export type PendingOperation = {
  id: string;
  accountId: string;
  entityId: string;
  action: 'save_stone' | 'delete_stone';
  baseVersion: number;
  payload: Stone;
  createdAt: string;
};
export type SyncMetadata = { key: string; cursor: string };

export class JournalDatabase extends Dexie {
  stones!: EntityTable<Stone, 'id'>;
  drafts!: EntityTable<Draft, 'id'>;
  preferences!: EntityTable<Preference, 'key'>;
  outbox!: EntityTable<PendingOperation, 'id'>;
  syncMetadata!: EntityTable<SyncMetadata, 'key'>;
  prayerContacts!: EntityTable<PrayerContact, 'id'>;

  constructor(name = 'ebenezer-journal') {
    super(name);
    this.version(1).stores({
      stones: 'id, accountId, journalDate, updatedAt, syncState',
      drafts: 'id, updatedAt',
      preferences: 'key',
      outbox: 'id, accountId, entityId, createdAt',
      syncMetadata: 'key',
    });
    // Explicit migration: adding tombstone indexing preserves v1 records.
    this.version(2).stores({
      stones: 'id, accountId, journalDate, updatedAt, syncState, deletedAt',
    });
    // People without an account (Mom). Device-only; never uploaded or synced.
    this.version(3).stores({ prayerContacts: 'id, accountId, displayName' });
  }
}
export const db = new JournalDatabase();
