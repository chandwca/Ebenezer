import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Settings } from 'lucide-react';
import type { CommunityGroup, GroupMember, PersonSearchResult } from '@ebenezer/contracts';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ContentLayout } from '@/components/ui/content-layout';
import { DialogModalLayout } from '@/components/ui/dialog-modal-layout';
import { GroupCard } from '@/components/ui/group-card';
import { PersonList, PersonRow } from '@/components/ui/person-row';
import { SectionCard } from '@/components/ui/section-card';
import type { CommunityApi } from './community-api';
import { GroupFormDialog } from './community-dialogs';
import { PeopleSearch } from './people-search';
import { errorKey, type useCommunity } from './use-community';

type Community = ReturnType<typeof useCommunity>;

function ManageGroupDialog({
  api,
  group,
  onEdit,
  onLeave,
  onDelete,
  onClose,
}: {
  api: CommunityApi;
  group: CommunityGroup;
  onEdit: () => void;
  onLeave: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('community');
  const [members, setMembers] = React.useState<GroupMember[]>();
  const [error, setError] = React.useState<string>();
  const [attempt, setAttempt] = React.useState(0);
  const leader = group.viewerRole === 'owner' || group.viewerRole === 'admin';
  React.useEffect(() => {
    const controller = new AbortController();
    api
      .members(group.id, controller.signal)
      .then((list) => !controller.signal.aborted && setMembers(list))
      .catch((cause: unknown) => !controller.signal.aborted && setError(errorKey(cause)));
    return () => controller.abort();
  }, [api, group.id, attempt]);
  const run = (task: Promise<unknown>) =>
    task
      .then(() => setAttempt((value) => value + 1))
      .catch((cause: unknown) => setError(errorKey(cause)));
  const memberIds = new Set(members?.map((member) => member.person.id));
  return (
    <DialogModalLayout
      title={group.name}
      description={t('groups.manageDescription')}
      onClose={onClose}
      footer={
        <>
          {leader && (
            <Button variant="outline" onClick={onEdit}>
              {t('groups.edit')}
            </Button>
          )}
          {group.viewerRole === 'owner' ? (
            <Button variant="destructive" onClick={onDelete}>
              {t('groups.delete')}
            </Button>
          ) : (
            <Button variant="outline" onClick={onLeave}>
              {t('groups.leave')}
            </Button>
          )}
        </>
      }
    >
      {error && <Alert>{t(`errors.${error}`)}</Alert>}
      {!members ? (
        <Alert variant="info">{t('status.loading')}</Alert>
      ) : (
        <PersonList>
          {members.map((member) => (
            <PersonRow
              key={member.person.id}
              name={member.person.displayName}
              detail={`@${member.person.handle}`}
              badge={t(
                member.status === 'invited' ? 'groups.role.invited' : `groups.role.${member.role}`,
              )}
            >
              {group.viewerRole === 'owner' &&
                member.role !== 'owner' &&
                member.status === 'active' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      void run(
                        api.setRole(
                          group.id,
                          member.person.id,
                          member.role === 'admin' ? 'member' : 'admin',
                        ),
                      )
                    }
                  >
                    {t(member.role === 'admin' ? 'groups.removeLeader' : 'groups.makeLeader')}
                  </Button>
                )}
              {leader &&
                member.role !== 'owner' &&
                (group.viewerRole === 'owner' || member.role !== 'admin') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void run(api.removeMember(group.id, member.person.id))}
                  >
                    {t('groups.remove')}
                  </Button>
                )}
            </PersonRow>
          ))}
        </PersonList>
      )}
      {leader && (
        <PeopleSearch
          api={api}
          label={t('groups.invite')}
          action={(person: PersonSearchResult) =>
            memberIds.has(person.id) ? (
              <Button variant="ghost" size="sm" disabled>
                {t('groups.alreadyIn')}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void run(api.invite(group.id, person.id))}
              >
                {t('groups.inviteAction')}
              </Button>
            )
          }
        />
      )}
    </DialogModalLayout>
  );
}

export function GroupsTab({
  community,
  onNotice,
}: {
  community: Community;
  onNotice: (message: string, error?: boolean) => void;
}) {
  const { t } = useTranslation('community');
  const { actions, api } = community;
  const [form, setForm] = React.useState<{ group?: CommunityGroup }>();
  const [managing, setManaging] = React.useState<CommunityGroup>();
  const [confirm, setConfirm] = React.useState<{
    group: CommunityGroup;
    kind: 'leave' | 'delete';
  }>();
  const fail = (error: unknown) => onNotice(t(`errors.${errorKey(error)}`), true);
  const mine = community.groups.filter(
    (group) => group.viewerRole && group.viewerRole !== 'invited',
  );
  const invited = community.groups.filter((group) => group.viewerRole === 'invited');
  const open = community.groups.filter((group) => group.visibility === 'open' && !group.viewerRole);
  const join = (group: CommunityGroup) =>
    void actions
      .joinGroup(group)
      .then(() => onNotice(t('groups.joined', { name: group.name })))
      .catch(fail);

  return (
    <ContentLayout layout="narrow">
      {invited.length > 0 && (
        <SectionCard title={t('groups.invitations')} plain>
          {invited.map((group) => (
            <GroupCard key={group.id} group={group}>
              <Button size="sm" onClick={() => join(group)}>
                {t('groups.accept')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  void actions
                    .leaveGroup(group)
                    .then(() => onNotice(t('groups.declined')))
                    .catch(fail)
                }
              >
                {t('groups.decline')}
              </Button>
            </GroupCard>
          ))}
        </SectionCard>
      )}
      <SectionCard
        title={t('groups.mine')}
        plain
        action={
          <Button onClick={() => setForm({})}>
            <Plus aria-hidden="true" />
            {t('groups.start')}
          </Button>
        }
      >
        {mine.length ? (
          mine.map((group) => (
            <GroupCard key={group.id} group={group}>
              <Button variant="outline" size="sm" onClick={() => setManaging(group)}>
                <Settings aria-hidden="true" />
                {t('groups.manage')}
              </Button>
            </GroupCard>
          ))
        ) : (
          <Alert variant="info">{t('groups.none')}</Alert>
        )}
      </SectionCard>
      <SectionCard title={t('groups.discover')} plain>
        {open.length ? (
          open.map((group) => (
            <GroupCard key={group.id} group={group}>
              <Button variant="outline" size="sm" onClick={() => join(group)}>
                {t('groups.join')}
              </Button>
            </GroupCard>
          ))
        ) : (
          <Alert variant="info">{t('groups.noneOpen')}</Alert>
        )}
      </SectionCard>

      {form && (
        <GroupFormDialog
          group={form.group}
          onClose={() => setForm(undefined)}
          onSave={async (values) => {
            if (form.group) await actions.updateGroup(form.group, values);
            else await actions.createGroup(values);
            setForm(undefined);
            onNotice(t(form.group ? 'groups.saved' : 'groups.created', { name: values.name }));
          }}
        />
      )}
      {managing && api && (
        <ManageGroupDialog
          api={api}
          group={managing}
          onClose={() => setManaging(undefined)}
          onEdit={() => {
            setForm({ group: managing });
            setManaging(undefined);
          }}
          onLeave={() => {
            setConfirm({ group: managing, kind: 'leave' });
            setManaging(undefined);
          }}
          onDelete={() => {
            setConfirm({ group: managing, kind: 'delete' });
            setManaging(undefined);
          }}
        />
      )}
      {confirm && (
        <ConfirmDialog
          title={t(`groups.${confirm.kind}Title`, { name: confirm.group.name })}
          description={t(`groups.${confirm.kind}Description`)}
          confirmLabel={t(`groups.${confirm.kind}`)}
          cancelLabel={t('cancel')}
          onCancel={() => setConfirm(undefined)}
          onConfirm={() =>
            void (
              confirm.kind === 'delete'
                ? actions.deleteGroup(confirm.group)
                : actions.leaveGroup(confirm.group)
            )
              .then(() => {
                onNotice(t(`groups.${confirm.kind}Done`, { name: confirm.group.name }));
                setConfirm(undefined);
              })
              .catch(fail)
          }
        />
      )}
    </ContentLayout>
  );
}
