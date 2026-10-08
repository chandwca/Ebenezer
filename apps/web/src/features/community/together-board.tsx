import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { HandHeart, Layers, Users } from 'lucide-react';
import type { PostKind } from '@ebenezer/contracts';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { AccountCard } from '@/features/account/account-card';
import { useAuth } from '@/features/auth/auth-provider';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { AskToPray, type PrayerTarget } from './ask-to-pray';
import { BoardTab } from './board-tab';
import { GroupsTab } from './groups-tab';
import { PeopleTab } from './people-tab';
import { useCommunity } from './use-community';
import { ContentLayout } from '@/components/ui/content-layout';

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

  const gate =
    community.status === 'signed_out' || community.status === 'profile_required' ? (
      <ContentLayout>
        <Alert variant="info">
          {t(community.status === 'signed_out' ? 'status.signIn' : 'status.profile')}
        </Alert>
        <AccountCard returnTo="/community" />
      </ContentLayout>
    ) : community.status === 'offline' ? (
      <Alert variant="info">{t('status.offline')}</Alert>
    ) : community.status === 'error' ? (
      <ContentLayout>
        <Alert>{t(`errors.${community.error ?? 'request_failed'}`)}</Alert>
        <Button variant="outline" onClick={community.actions.reload}>
          {t('status.retry')}
        </Button>
      </ContentLayout>
    ) : community.status === 'loading' ? (
      <Alert variant="info">{t('status.loading')}</Alert>
    ) : null;

  return (
    <ContentLayout>
      <SegmentedTabs
        flush
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
      {notice && <Alert variant={notice.error ? 'error' : 'success'}>{notice.message}</Alert>}

      {tab === 'people' ? (
        <PeopleTab community={community} onAsk={setAsking} onNotice={onNotice} />
      ) : !ready && gate ? (
        gate
      ) : tab === 'board' ? (
        <BoardTab community={community} filter={filter} onFilter={setFilter} onNotice={onNotice} />
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
    </ContentLayout>
  );
}
