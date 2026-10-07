import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, HandHeart, Send, Sparkles } from 'lucide-react';
import type { CreatePost, PostKind } from '@ebenezer/contracts';
import { Avatar } from './avatar';
import { Button } from './button';
import { Card } from './card';
import { Checkbox } from './checkbox';
import { WritingArea } from './input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { ToggleChips } from './toggle-chips';

const kinds = [
  { value: 'experience', icon: Sparkles },
  { value: 'prayer_request', icon: HandHeart },
  { value: 'stone', icon: BookOpen },
] as const;

/** A private stone the person may choose to share; only these fields are ever published. */
export type ShareableStone = {
  id: string;
  label: string;
  memory: string;
  reference: string;
  scriptureText?: string;
  tone?: 'bright' | 'mixed' | 'hard';
};

/** Board composer: what to share and who sees it. Publishing is the caller's job. */
export function PostComposer({
  authorName,
  groups,
  friends,
  stones,
  onSubmit,
}: {
  authorName: string;
  groups: readonly { id: string; name: string }[];
  friends: readonly { id: string; name: string }[];
  stones: readonly ShareableStone[];
  /** Resolves when published; rejects to keep the draft. */
  onSubmit: (post: CreatePost) => Promise<unknown>;
}) {
  const { t } = useTranslation('community');
  const id = React.useId();
  const [kind, setKind] = React.useState<PostKind>('experience');
  const [audience, setAudience] = React.useState('community');
  const [body, setBody] = React.useState('');
  const [stoneId, setStoneId] = React.useState('');
  const [recipients, setRecipients] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);
  const stone = stones.find((item) => item.id === stoneId);
  const scope = audience.split(':')[0] as CreatePost['audience'];
  const ready =
    !!body.trim() && (kind !== 'stone' || !!stone) && (scope !== 'people' || recipients.length > 0);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready) return;
    const groupId = audience.split(':')[1];
    setBusy(true);
    try {
      await onSubmit({
        kind,
        audience: scope,
        body: body.trim(),
        ...(groupId ? { groupId } : {}),
        ...(scope === 'people' ? { recipientIds: recipients } : {}),
        ...(kind === 'stone' && stone
          ? {
              scriptureReference: stone.reference,
              ...(stone.scriptureText ? { scriptureText: stone.scriptureText.slice(0, 2000) } : {}),
              ...(stone.tone ? { tone: stone.tone } : {}),
            }
          : {}),
      });
      setBody('');
      setStoneId('');
      setRecipients([]);
    } catch {
      // The caller shows the error; the draft stays.
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="p-5 sm:p-6">
      <form onSubmit={submit} aria-labelledby={`${id}-title`}>
        <div className="flex items-center gap-3">
          <Avatar name={authorName} />
          <h2 id={`${id}-title`} className="font-display text-lg font-semibold tracking-tight">
            {t('composer.title')}
          </h2>
        </div>
        <div className="mt-4">
          <ToggleChips
            label={t('composer.kind')}
            value={kind}
            onChange={setKind}
            options={kinds.map(({ value, icon }) => ({ value, icon, label: t(`kind.${value}`) }))}
          />
        </div>
        {kind === 'stone' && (
          <div className="mt-4">
            {stones.length ? (
              <Select
                value={stoneId}
                onValueChange={(value) => {
                  setStoneId(value);
                  const chosen = stones.find((item) => item.id === value);
                  if (chosen && !body.trim()) setBody(chosen.memory);
                }}
              >
                <SelectTrigger aria-label={t('composer.chooseStone')} className="w-full">
                  <SelectValue placeholder={t('composer.chooseStone')} />
                </SelectTrigger>
                <SelectContent>
                  {stones.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">{t('composer.noStones')}</p>
            )}
          </div>
        )}
        <label htmlFor={`${id}-body`} className="sr-only">
          {t('composer.bodyLabel')}
        </label>
        <WritingArea
          id={`${id}-body`}
          className="mt-4"
          minHeight={96}
          maxLength={4000}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={t(`composer.placeholder.${kind}`)}
        />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Select value={audience} onValueChange={setAudience}>
            <SelectTrigger aria-label={t('composer.audience')} className="min-w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="community">{t('composer.everyone')}</SelectItem>
              {groups.map((group) => (
                <SelectItem key={group.id} value={`group:${group.id}`}>
                  {group.name}
                </SelectItem>
              ))}
              <SelectItem value="people">{t('composer.friends')}</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" disabled={!ready || busy}>
            <Send aria-hidden="true" />
            {t(busy ? 'composer.sharing' : 'composer.share')}
          </Button>
        </div>
        {scope === 'people' && (
          <fieldset className="mt-4 rounded-xl border p-3">
            <legend className="px-1 text-sm font-semibold">{t('composer.pickFriends')}</legend>
            {friends.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {friends.map((friend) => (
                  <label key={friend.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={recipients.includes(friend.id)}
                      onChange={(event) =>
                        setRecipients((current) =>
                          event.target.checked
                            ? [...current, friend.id]
                            : current.filter((value) => value !== friend.id),
                        )
                      }
                    />
                    {friend.name}
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('composer.noFriends')}</p>
            )}
          </fieldset>
        )}
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          {t(`composer.reach.${scope}`)}
        </p>
      </form>
    </Card>
  );
}
