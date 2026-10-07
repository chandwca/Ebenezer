import type * as React from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarClock, Globe, Lock, Users } from 'lucide-react';
import type { CommunityGroup } from '@ebenezer/contracts';
import { Badge } from './badge';
import { Card } from './card';

export function GroupCard({
  group,
  compact = false,
  children,
}: {
  group: CommunityGroup;
  compact?: boolean;
  /** Join, accept, manage or leave actions. */
  children?: React.ReactNode;
}) {
  const { t } = useTranslation('community');
  return (
    <Card className={compact ? 'p-4' : 'p-5'}>
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-teal">
          <Users size={20} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-snug">{group.name}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              {group.visibility === 'open' ? (
                <Globe className="size-3.5" aria-hidden="true" />
              ) : (
                <Lock className="size-3.5" aria-hidden="true" />
              )}
              {t(`groups.visibility.${group.visibility}`)}
            </span>
            <span>{t('groups.members', { count: group.memberCount })}</span>
          </p>
        </div>
        {group.viewerRole && (
          <Badge variant="secondary">{t(`groups.role.${group.viewerRole}`)}</Badge>
        )}
      </div>
      {!compact && group.description && (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{group.description}</p>
      )}
      {group.meetingNote && (
        <p className="mt-3 inline-flex items-center gap-2 text-sm text-secondary-foreground">
          <CalendarClock className="size-4" aria-hidden="true" />
          {group.meetingNote}
        </p>
      )}
      {children && <div className="mt-4 flex flex-wrap gap-2">{children}</div>}
    </Card>
  );
}
