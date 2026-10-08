import * as React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { HandHeart, Pencil, Trash2, UserPlus } from 'lucide-react';
import type { Connection, PrayerContact } from '@ebenezer/contracts';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ContentLayout } from '@/components/ui/content-layout';
import { FeatureCard } from '@/components/ui/feature-card';
import { PersonList, PersonRow } from '@/components/ui/person-row';
import { SectionCard } from '@/components/ui/section-card';
import { Link2 } from 'lucide-react';
import { contacts } from '@/db/contacts';
import type { PrayerTarget } from './ask-to-pray';
import { ContactDialog } from './community-dialogs';
import { PeopleSearch } from './people-search';
import { errorKey, type useCommunity } from './use-community';

type Community = ReturnType<typeof useCommunity>;

export function usePrayerContacts() {
  return useLiveQuery(() => contacts.list().catch(() => [] as PrayerContact[]));
}

export function PeopleTab({
  community,
  onAsk,
  onNotice,
}: {
  community: Community;
  onAsk: (target: PrayerTarget) => void;
  onNotice: (message: string, error?: boolean) => void;
}) {
  const { t } = useTranslation('community');
  const people = usePrayerContacts();
  const [editing, setEditing] = React.useState<{ contact?: PrayerContact }>();
  const [removing, setRemoving] = React.useState<
    { kind: 'contact'; contact: PrayerContact } | { kind: 'friend'; connection: Connection }
  >();
  const { actions, api } = community;
  const signedIn = community.status === 'ready';
  const fail = (error: unknown) => onNotice(t(`errors.${errorKey(error)}`), true);
  const incoming = community.connections.filter(
    (item) => item.status === 'pending' && item.direction === 'incoming',
  );
  const outgoing = community.connections.filter(
    (item) => item.status === 'pending' && item.direction === 'outgoing',
  );
  const friends = community.connections.filter((item) => item.status === 'accepted');

  return (
    <ContentLayout layout="columns">
      <ContentLayout>
        {incoming.length > 0 && (
          <SectionCard title={t('people.requests')}>
            <PersonList>
              {incoming.map((connection) => (
                <PersonRow
                  key={connection.id}
                  name={connection.person.displayName}
                  detail={`@${connection.person.handle}`}
                >
                  <Button
                    size="sm"
                    onClick={() =>
                      void actions
                        .respond(connection, true)
                        .then(() =>
                          onNotice(t('people.nowFriends', { name: connection.person.displayName })),
                        )
                        .catch(fail)
                    }
                  >
                    {t('people.accept')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void actions.respond(connection, false).catch(fail)}
                  >
                    {t('people.decline')}
                  </Button>
                </PersonRow>
              ))}
            </PersonList>
          </SectionCard>
        )}
        <SectionCard
          title={t('people.known')}
          description={t('people.knownHint')}
          action={
            <Button variant="outline" size="sm" onClick={() => setEditing({})}>
              <UserPlus aria-hidden="true" />
              {t('people.addContact')}
            </Button>
          }
        >
          <PersonList empty={t('people.noContacts')}>
            {(people ?? []).map((contact) => (
              <PersonRow
                key={contact.id}
                name={contact.displayName}
                detail={[contact.relationship, t(`people.channel.${contact.channel}`)]
                  .filter(Boolean)
                  .join(' · ')}
              >
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={t('people.askNamed', { name: contact.displayName })}
                  onClick={() => onAsk({ kind: 'contact', contact })}
                >
                  <HandHeart aria-hidden="true" />
                  {t('people.ask')}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('people.editNamed', { name: contact.displayName })}
                  onClick={() => setEditing({ contact })}
                >
                  <Pencil aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('people.removeNamed', { name: contact.displayName })}
                  onClick={() => setRemoving({ kind: 'contact', contact })}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </PersonRow>
            ))}
          </PersonList>
        </SectionCard>
        <SectionCard title={t('people.friends')} description={t('people.friendsHint')}>
          {signedIn ? (
            <PersonList empty={t('people.noFriends')}>
              {[...friends, ...outgoing].map((connection) => (
                <PersonRow
                  key={connection.id}
                  name={connection.person.displayName}
                  detail={`@${connection.person.handle}`}
                  badge={connection.status === 'pending' ? t('people.requested') : undefined}
                >
                  {connection.status === 'accepted' && (
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={t('people.askNamed', { name: connection.person.displayName })}
                      onClick={() => onAsk({ kind: 'friend', connection })}
                    >
                      <HandHeart aria-hidden="true" />
                      {t('people.ask')}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t(
                      connection.status === 'pending' ? 'people.cancelNamed' : 'people.removeNamed',
                      { name: connection.person.displayName },
                    )}
                    onClick={() => setRemoving({ kind: 'friend', connection })}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </PersonRow>
              ))}
            </PersonList>
          ) : (
            <Alert variant="info">{t('people.signInForFriends')}</Alert>
          )}
        </SectionCard>
      </ContentLayout>
      <ContentLayout>
        {signedIn && api && (
          <PeopleSearch
            api={api}
            label={t('people.find')}
            refreshKey={community.connections}
            action={(person) =>
              person.connection ? (
                <Button variant="ghost" size="sm" disabled>
                  {t(
                    person.connection.status === 'accepted'
                      ? 'people.alreadyFriends'
                      : 'people.requested',
                  )}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void actions
                      .requestFriend(person.id)
                      .then(() => onNotice(t('people.requestSent', { name: person.displayName })))
                      .catch(fail)
                  }
                >
                  <UserPlus aria-hidden="true" />
                  {t('people.addFriend')}
                </Button>
              )
            }
          />
        )}
        <FeatureCard
          icon={Link2}
          title={t('people.linkTitle')}
          description={t('people.linkDescription')}
          steps={[t('people.linkStep1'), t('people.linkStep2'), t('people.linkStep3')]}
        />
      </ContentLayout>

      {editing && (
        <ContactDialog
          contact={editing.contact}
          onClose={() => setEditing(undefined)}
          onSave={async (values) => {
            if (editing.contact) await contacts.update(editing.contact.id, values);
            else await contacts.add(values);
            setEditing(undefined);
            onNotice(
              t(editing.contact ? 'people.saved' : 'people.added', { name: values.displayName }),
            );
          }}
        />
      )}
      {removing && (
        <ConfirmDialog
          title={t(
            removing.kind === 'contact'
              ? 'people.removeContactTitle'
              : removing.connection.status === 'pending'
                ? 'people.cancelTitle'
                : 'people.removeFriendTitle',
            {
              name:
                removing.kind === 'contact'
                  ? removing.contact.displayName
                  : removing.connection.person.displayName,
            },
          )}
          description={t(
            removing.kind === 'contact'
              ? 'people.removeContactDescription'
              : 'people.removeFriendDescription',
          )}
          confirmLabel={t('people.remove')}
          cancelLabel={t('cancel')}
          onCancel={() => setRemoving(undefined)}
          onConfirm={() => {
            const task =
              removing.kind === 'contact'
                ? contacts.remove(removing.contact.id)
                : actions.removeFriend(removing.connection);
            void task.then(() => setRemoving(undefined)).catch(fail);
          }}
        />
      )}
    </ContentLayout>
  );
}
