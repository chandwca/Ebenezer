import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { HandHeart, Layers, Users } from 'lucide-react';
import type { PostKind } from '@ebenezer/contracts';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PersonList, PersonRow } from '@/components/ui/person-row';
import { SectionCard } from '@/components/ui/section-card';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { AccountCard } from '@/features/account/account-card';
import { useAuth } from '@/features/auth/auth-provider';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { AskToPray, type PrayerTarget } from './ask-to-pray';
import { BoardTab } from './board-tab';
import { GroupsTab } from './groups-tab';
import { PeopleTab, usePrayerContacts } from './people-tab';
import { useCommunity } from './use-community';

type Tab = 'board' | 'groups' | 'people';

export function TogetherBoard({ initialTab = 'board' }: { initialTab?: Tab }) {
  const { session } = useAuth();
  return <AccountBoard key={session?.user.id ?? 'signed-out'} initialTab={initialTab} />;
}

function AccountBoard({ initialTab }: { initialTab: Tab }) {
  const { t } = useTranslation('community');
  const online = useOnlineStatus();
  const [tab, setTab] = React.useState<Tab>(initialTab);
  const [filter, setFilter] = React.useState<'all' | PostKind>('all');
  const community = useCommunity(filter === 'all' ? undefined : filter);
  const contactList = usePrayerContacts() ?? [];
  const [asking, setAsking] = React.useState<PrayerTarget>();
  const [notice, setNotice] = React.useState<{ message: string; error: boolean }>();
  const onNotice = React.useCallback(
    (message: string, error = false) => setNotice({ message, error }),
    [],
  );
  const ready =
    community.status === 'ready' || (community.status === 'loading' && community.loaded);
  const incoming = community.connections.filter(
    (item) => item.status === 'pending' && item.direction === 'incoming',
  ).length;
  const invitations = community.groups.filter((group) => group.viewerRole === 'invited').length;
  const friends = community.connections.filter((item) => item.status === 'accepted');
  const quickPeople: PrayerTarget[] = [
    ...contactList.map((contact) => ({ kind: 'contact' as const, contact })),
    ...friends.map((connection) => ({ kind: 'friend' as const, connection })),
  ].slice(0, 5);

  const gate =
    community.status === 'signed_out' || community.status === 'profile_required' ? (
      <>
        <Alert variant="info">
          {t(community.status === 'signed_out' ? 'status.signIn' : 'status.profile')}
        </Alert>
        <AccountCard />
      </>
    ) : community.status === 'offline' ? (
      <Alert variant="info">{t('status.offline')}</Alert>
    ) : community.status === 'error' ? (
      <>
        <Alert>{t(`errors.${community.error ?? 'request_failed'}`)}</Alert>
        <Button variant="outline" onClick={community.actions.reload}>
          {t('status.retry')}
        </Button>
      </>
    ) : community.status === 'loading' ? (
      <Alert variant="info">{t('status.loading')}</Alert>
    ) : null;

  return (
    <>
      {notice && <Alert variant={notice.error ? 'error' : 'success'}>{notice.message}</Alert>}
      <SegmentedTabs
        label={t('tabs.label')}
        value={tab}
        onChange={(value) => {
          setNotice(undefined);
          setTab(value);
        }}
        options={[
          { value: 'board', label: t('tabs.board'), icon: Layers },
          { value: 'groups', label: t('tabs.groups'), icon: Users, count: invitations },
          { value: 'people', label: t('tabs.people'), icon: HandHeart, count: incoming },
        ]}
      />

      {tab === 'people' ? (
        <PeopleTab community={community} onAsk={setAsking} onNotice={onNotice} />
      ) : !ready && gate ? (
        gate
      ) : tab === 'board' ? (
        <BoardTab
          community={community}
          filter={filter}
          onFilter={setFilter}
          onNotice={onNotice}
          aside={
            <SectionCard
              title={t('side.askTitle')}
              description={t('side.askDescription')}
              action={
                <Button variant="ghost" size="sm" onClick={() => setTab('people')}>
                  {t('side.seeAll')}
                </Button>
              }
            >
              <PersonList empty={t('side.noPeople')}>
                {quickPeople.map((target) => {
                  const name =
                    target.kind === 'contact'
                      ? target.contact.displayName
                      : target.connection.person.displayName;
                  return (
                    <PersonRow
                      key={target.kind === 'contact' ? target.contact.id : target.connection.id}
                      name={name}
                      detail={
                        target.kind === 'contact'
                          ? t('people.noAccount')
                          : `@${target.connection.person.handle}`
                      }
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={t('people.askNamed', { name })}
                        onClick={() => setAsking(target)}
                      >
                        <HandHeart aria-hidden="true" />
                        {t('people.ask')}
                      </Button>
                    </PersonRow>
                  );
                })}
              </PersonList>
            </SectionCard>
          }
        />
      ) : (
        <GroupsTab community={community} onNotice={onNotice} />
      )}

      {asking && (
        <AskToPray
          target={asking}
          api={community.status === 'ready' ? community.api : undefined}
          online={online}
          onDone={(message) => {
            setAsking(undefined);
            onNotice(message);
          }}
          onClose={() => setAsking(undefined)}
        />
      )}
    </>
  );
}
