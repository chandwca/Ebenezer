import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Flag, Globe, HandHeart, Lock, MessageCircle, Pencil, Trash2, Users } from 'lucide-react';
import type { CommunityPost } from '@ebenezer/contracts';
import { relativeTime } from '@/lib/relative-time';
import { cn } from '@/lib/utils';
import { Avatar } from './avatar';
import { Badge } from './badge';
import { Button } from './button';
import { Card } from './card';
import { stoneColors } from './stone-appearance';

export function CommunityPostCard({
  post,
  busy = false,
  commentsOpen = false,
  onPray,
  onToggleComments,
  onEdit,
  onDelete,
  onReport,
  children,
}: {
  post: CommunityPost;
  busy?: boolean;
  commentsOpen?: boolean;
  onPray: (post: CommunityPost) => void;
  onToggleComments: (post: CommunityPost) => void;
  onEdit?: (post: CommunityPost) => void;
  onDelete?: (post: CommunityPost) => void;
  onReport?: (post: CommunityPost) => void;
  /** Comment thread, shown when comments are open. */
  children?: React.ReactNode;
}) {
  const { t, i18n } = useTranslation('community');
  const titleId = React.useId();
  const AudienceIcon = { community: Globe, group: Users, people: Lock }[post.audience];
  return (
    <Card
      role="article"
      aria-labelledby={titleId}
      className={cn('p-5 sm:p-6', post.kind === 'prayer_request' && 'border-gold/50')}
    >
      <div className="flex items-start gap-3">
        <Avatar name={post.author.displayName} />
        <div className="min-w-0 flex-1">
          <p id={titleId} className="truncate font-semibold">
            {post.isOwn ? t('post.you') : post.author.displayName}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            @{post.author.handle} · {relativeTime(post.createdAt, i18n.language)}
            {post.updatedAt !== post.createdAt && ` · ${t('post.edited')}`}
          </p>
        </div>
        <Badge variant="outline" className="max-w-40 text-muted-foreground">
          <AudienceIcon aria-hidden="true" />
          <span className="truncate">
            {post.audience === 'group' && post.group
              ? post.group.name
              : t(
                  post.isOwn && post.audience === 'people'
                    ? 'audience.chosen'
                    : `audience.${post.audience}`,
                )}
          </span>
        </Badge>
      </div>
      <p className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.14em] text-teal">
        {post.tone && (
          <span
            aria-hidden="true"
            className="size-2.5 rounded-full"
            style={{ background: stoneColors[post.tone].fill }}
          />
        )}
        {t(`kind.${post.kind}`)}
      </p>
      <p className="mt-2 whitespace-pre-line leading-7">{post.body}</p>
      {post.scriptureReference && (
        <blockquote className="mt-4 rounded-xl border-l-4 border-teal bg-secondary/50 px-4 py-3">
          {post.scriptureText && (
            <p className="font-serif text-[15px] leading-7" lang="en">
              “{post.scriptureText}”
            </p>
          )}
          <cite className="mt-1 block text-xs font-semibold not-italic text-secondary-foreground">
            {post.scriptureReference}
          </cite>
        </blockquote>
      )}
      {post.prayingNames.length > 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          {t('post.prayingNames', {
            names: new Intl.ListFormat(i18n.language).format(post.prayingNames),
          })}
        </p>
      )}
      {post.guestNotes?.map((note) => (
        <p
          key={`${note.label}-${note.createdAt}`}
          className="mt-3 rounded-xl bg-gold/15 px-4 py-3 text-sm leading-6"
        >
          <span className="font-semibold">{t('post.guestNote', { name: note.label })}</span>{' '}
          {note.note}
        </p>
      ))}
      <div className="mt-4 flex flex-wrap items-center gap-1 border-t pt-3">
        <Button
          variant={post.viewerPrayed ? 'secondary' : 'ghost'}
          size="sm"
          aria-pressed={post.viewerPrayed}
          disabled={busy}
          onClick={() => onPray(post)}
        >
          <HandHeart aria-hidden="true" />
          {t(post.viewerPrayed ? 'post.praying' : 'post.pray')}
          <span className="tabular-nums">{post.prayerCount}</span>
        </Button>
        <Button
          variant={commentsOpen ? 'secondary' : 'ghost'}
          size="sm"
          aria-expanded={commentsOpen}
          onClick={() => onToggleComments(post)}
        >
          <MessageCircle aria-hidden="true" />
          {t('post.comments', { count: post.commentCount })}
        </Button>
        <span className="ml-auto flex gap-1">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('post.edit')}
              onClick={() => onEdit(post)}
            >
              <Pencil aria-hidden="true" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('post.delete')}
              onClick={() => onDelete(post)}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          )}
          {onReport && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('post.report')}
              onClick={() => onReport(post)}
            >
              <Flag aria-hidden="true" />
            </Button>
          )}
        </span>
      </div>
      {commentsOpen && children}
    </Card>
  );
}
