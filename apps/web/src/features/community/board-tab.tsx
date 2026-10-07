import * as React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { BookOpen, HandHeart, Sparkles } from 'lucide-react';
import type { CommunityPost, PostKind } from '@ebenezer/contracts';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CommunityPostCard } from '@/components/ui/community-post-card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ContentLayout } from '@/components/ui/content-layout';
import { GroupCard } from '@/components/ui/group-card';
import { PostComposer, type ShareableStone } from '@/components/ui/post-composer';
import { SectionCard } from '@/components/ui/section-card';
import { ToggleChips } from '@/components/ui/toggle-chips';
import { journal } from '@/db/repositories';
import { EditPostDialog } from './community-dialogs';
import { PostComments } from './post-comments';
import { errorKey, type useCommunity } from './use-community';

type Community = ReturnType<typeof useCommunity>;

/** Recent private stones the person can choose to share; nothing is shared until they do. */
function useShareableStones(): ShareableStone[] {
  return (
    useLiveQuery(async () => {
      try {
        return (await journal.listStones()).slice(0, 30).map((stone) => ({
          id: stone.id,
          label: `${stone.journalDate} · ${stone.ref}`,
          memory: stone.memory,
          reference: stone.ref,
          scriptureText: stone.scripture?.text,
          tone: (['bright', 'mixed', 'hard'] as const).find((tone) => tone === stone.tone),
        }));
      } catch {
        return [];
      }
    }) ?? []
  );
}

export function BoardTab({
  community,
  filter,
  onFilter,
  onNotice,
  aside,
}: {
  community: Community;
  filter: 'all' | PostKind;
  onFilter: (filter: 'all' | PostKind) => void;
  onNotice: (message: string, error?: boolean) => void;
  aside: React.ReactNode;
}) {
  const { t } = useTranslation('community');
  const stones = useShareableStones();
  const [openComments, setOpenComments] = React.useState<string>();
  const [editing, setEditing] = React.useState<CommunityPost>();
  const [deleting, setDeleting] = React.useState<CommunityPost>();
  const [busyPost, setBusyPost] = React.useState<string>();
  const [loadingMore, setLoadingMore] = React.useState(false);
  const { actions, api } = community;
  const fail = (error: unknown) => onNotice(t(`errors.${errorKey(error)}`), true);
  const myGroups = community.groups.filter(
    (group) => group.viewerRole && group.viewerRole !== 'invited',
  );
  const friends = community.connections
    .filter((connection) => connection.status === 'accepted')
    .map((connection) => ({ id: connection.person.id, name: connection.person.displayName }));

  async function pray(post: CommunityPost) {
    setBusyPost(post.id);
    try {
      await actions.togglePrayer(post);
    } catch (error) {
      fail(error);
    } finally {
      setBusyPost(undefined);
    }
  }

  return (
    <ContentLayout layout="split">
      <ContentLayout>
        <PostComposer
          authorName={community.profileName ?? t('post.you')}
          groups={myGroups}
          friends={friends}
          stones={stones}
          onSubmit={async (post) => {
            try {
              await actions.publish(post);
              onNotice(t(`composer.shared.${post.audience}`));
            } catch (error) {
              fail(error);
              throw error;
            }
          }}
        />
        <ToggleChips
          label={t('filter.label')}
          value={filter}
          onChange={onFilter}
          options={[
            { value: 'all', label: t('filter.all') },
            { value: 'prayer_request', label: t('filter.prayer_request'), icon: HandHeart },
            { value: 'stone', label: t('filter.stone'), icon: BookOpen },
            { value: 'experience', label: t('filter.experience'), icon: Sparkles },
          ]}
        />
        {community.status === 'loading' && !community.posts.length ? (
          <Alert variant="info">{t('status.loading')}</Alert>
        ) : community.posts.length ? (
          community.posts.map((post) => (
            <CommunityPostCard
              key={post.id}
              post={post}
              busy={busyPost === post.id}
              commentsOpen={openComments === post.id}
              onPray={(item) => void pray(item)}
              onToggleComments={(item) =>
                setOpenComments((current) => (current === item.id ? undefined : item.id))
              }
              onEdit={post.isOwn ? setEditing : undefined}
              onDelete={post.isOwn ? setDeleting : undefined}
              onReport={
                post.isOwn
                  ? undefined
                  : (item) =>
                      void actions
                        .report(item)
                        .then(() => onNotice(t('post.reported')))
                        .catch(fail)
              }
            >
              {api && (
                <PostComments
                  api={api}
                  post={post}
                  onError={(code) => onNotice(t(`errors.${code}`), true)}
                  onCountChange={(count) => actions.setCommentCount(post.id, count)}
                />
              )}
            </CommunityPostCard>
          ))
        ) : (
          <Alert variant="info">{t('filter.empty')}</Alert>
        )}
        {community.nextCursor && (
          <Button
            variant="outline"
            disabled={loadingMore}
            onClick={() => {
              setLoadingMore(true);
              actions
                .loadMore()
                .catch(fail)
                .finally(() => setLoadingMore(false));
            }}
          >
            {t(loadingMore ? 'status.loading' : 'filter.more')}
          </Button>
        )}
      </ContentLayout>
      <ContentLayout>
        {aside}
        {community.groups.some((group) => group.visibility === 'open' && !group.viewerRole) && (
          <SectionCard title={t('side.groupsTitle')} plain>
            {community.groups
              .filter((group) => group.visibility === 'open' && !group.viewerRole)
              .slice(0, 3)
              .map((group) => (
                <GroupCard key={group.id} group={group} compact>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void actions
                        .joinGroup(group)
                        .then(() => onNotice(t('groups.joined', { name: group.name })))
                        .catch(fail)
                    }
                  >
                    {t('groups.join')}
                  </Button>
                </GroupCard>
              ))}
          </SectionCard>
        )}
      </ContentLayout>

      {editing && (
        <EditPostDialog
          body={editing.body}
          onClose={() => setEditing(undefined)}
          onSave={async (body) => {
            await actions.editPost(editing, body);
            setEditing(undefined);
            onNotice(t('post.saved'));
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={t('post.deleteTitle')}
          description={t('post.deleteDescription')}
          confirmLabel={t('post.delete')}
          cancelLabel={t('cancel')}
          onCancel={() => setDeleting(undefined)}
          onConfirm={() =>
            void actions
              .deletePost(deleting)
              .then(() => {
                setDeleting(undefined);
                onNotice(t('post.deleted'));
              })
              .catch(fail)
          }
        />
      )}
    </ContentLayout>
  );
}
