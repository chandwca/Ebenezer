import * as React from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Check, Copy, Send, SendHorizontal } from 'lucide-react';
import { Button } from './button';
import { Card } from './card';
import { WritingArea } from './input';
import { ToggleChips } from './toggle-chips';

export function WordResponse<T extends string>({
  label,
  options,
  value,
  onChange,
  noteLabel,
  note,
  onNoteChange,
  replyLabel,
  onReply,
  copyLabel,
  copiedLabel,
  copied,
  onCopy,
  privacy,
  keepLabel,
  keptLabel,
  kept,
  onKeep,
  passLabel,
  passTo,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T | '';
  onChange: (value: T) => void;
  noteLabel: string;
  note: string;
  onNoteChange: (value: string) => void;
  replyLabel: string;
  onReply: () => void;
  copyLabel: string;
  copiedLabel: string;
  copied: boolean;
  onCopy: () => void;
  privacy: string;
  keepLabel: string;
  keptLabel: string;
  kept: boolean;
  onKeep: () => void;
  passLabel: string;
  passTo: string;
}) {
  const noteId = React.useId();
  return (
    <>
      <Card className="grid gap-4">
        <h2 className="font-display text-lg font-semibold tracking-tight">{label}</h2>
        <ToggleChips label={label} value={value as T} options={options} onChange={onChange} />
        {value && (
          <>
            <label htmlFor={noteId} className="sr-only">
              {noteLabel}
            </label>
            <WritingArea
              id={noteId}
              minHeight={64}
              maxLength={300}
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
              placeholder={noteLabel}
            />
            <div className="flex flex-wrap gap-3">
              <Button variant="gold" onClick={onReply}>
                <SendHorizontal aria-hidden="true" />
                {replyLabel}
              </Button>
              <Button variant="outline" onClick={onCopy}>
                {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                {copied ? copiedLabel : copyLabel}
              </Button>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">{privacy}</p>
          </>
        )}
      </Card>
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={onKeep} disabled={kept}>
          {kept ? <Check aria-hidden="true" /> : <Bookmark aria-hidden="true" />}
          {kept ? keptLabel : keepLabel}
        </Button>
        <Button asChild variant="ghost">
          <Link to={passTo}>
            <Send aria-hidden="true" />
            {passLabel}
          </Link>
        </Button>
      </div>
    </>
  );
}
