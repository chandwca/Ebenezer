import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Trash2 } from 'lucide-react';
import type { Comment } from '@ebenezer/contracts';
import { relativeTime } from '@/lib/relative-time';
import { Avatar } from './avatar';
import { Button } from './button';
import { Input } from './input';

export function CommentThread({
  comments,
  status,
  onAdd,
  onDelete,
}: {
  comments: readonly Comment[];
  status: 'loading' | 'ready' | 'error';
  /** Resolves when saved; rejects to keep the draft. */
  onAdd: (body: string) => Promise<void>;
  onDelete: (comment: Comment) => void;
}) {
  const { t, i18n } = useTranslation('community');
  const id = React.useId();
  const [body, setBody] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      await onAdd(body.trim());
      setBody('');
    } catch {
      // The caller reports the error; keep the draft.
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-3 rounded-xl bg-background p-3 sm:p-4">
      {status === 'loading' && (
        <p className="text-sm text-muted-foreground">{t('comments.loading')}</p>
      )}
      {status === 'error' && (
        <p className="text-sm text-destructive">{t('errors.request_failed')}</p>
      )}
      {status === 'ready' && comments.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('comments.empty')}</p>
      )}
      <ul className="grid gap-3">
        {comments.map((comment) => (
          <li key={comment.id} className="flex items-start gap-2">
            <Avatar name={comment.author.displayName} size="sm" />
            <div className="min-w-0 flex-1 rounded-xl bg-card px-3 py-2">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{comment.author.displayName}</span>{' '}
                · {relativeTime(comment.createdAt, i18n.language)}
              </p>
              <p className="mt-0.5 whitespace-pre-line text-sm leading-6">{comment.body}</p>
            </div>
            {comment.canDelete && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('comments.delete')}
                onClick={() => onDelete(comment)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <label htmlFor={id} className="sr-only">
          {t('comments.label')}
        </label>
        <Input
          id={id}
          value={body}
          maxLength={2000}
          placeholder={t('comments.placeholder')}
          onChange={(event) => setBody(event.target.value)}
        />
        <Button
          type="submit"
          size="icon"
          disabled={busy || !body.trim()}
          aria-label={t('comments.send')}
        >
          <Send aria-hidden="true" />
        </Button>
      </form>
    </div>
  );
}
