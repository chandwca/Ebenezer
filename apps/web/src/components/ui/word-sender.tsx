import * as React from 'react';
import { Check, Copy, QrCode, Share2 } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { ToggleChips } from './toggle-chips';

export function WordSender<T extends string>({
  header,
  qrLabel,
  onQr,
  pickLabel,
  moments,
  value,
  onChange,
  nameLabel,
  name,
  namePlaceholder,
  onNameChange,
  children,
  shareLabel,
  onShare,
  copyLabel,
  copiedLabel,
  copied,
  onCopy,
  disabled,
}: {
  header?: React.ReactNode;
  qrLabel: string;
  onQr: () => void;
  pickLabel: string;
  moments: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  nameLabel: string;
  name: string;
  namePlaceholder: string;
  onNameChange: (value: string) => void;
  children: React.ReactNode;
  shareLabel: string;
  onShare: () => void;
  copyLabel: string;
  copiedLabel: string;
  copied: boolean;
  onCopy: () => void;
  disabled: boolean;
}) {
  const nameId = React.useId();
  return (
    <div className="grid gap-5">
      {header}
      <ToggleChips label={pickLabel} value={value} options={moments} onChange={onChange} />
      {children}
      <div className="grid gap-2">
        <label htmlFor={nameId} className="text-sm font-semibold">
          {nameLabel}
        </label>
        <Input
          id={nameId}
          value={name}
          maxLength={30}
          autoComplete="given-name"
          placeholder={namePlaceholder}
          onChange={(event) => onNameChange(event.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button variant="gold" onClick={onShare} disabled={disabled}>
          <Share2 aria-hidden="true" />
          {shareLabel}
        </Button>
        <Button variant="outline" onClick={onQr}>
          <QrCode aria-hidden="true" />
          {qrLabel}
        </Button>
        <Button variant="outline" onClick={onCopy} disabled={disabled}>
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {copied ? copiedLabel : copyLabel}
        </Button>
      </div>
    </div>
  );
}
