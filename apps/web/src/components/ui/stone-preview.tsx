import { stoneColors } from './stone-appearance';

export function StonePreview({
  memory,
  tone,
  reference,
  symbol,
  label,
}: {
  memory: string;
  tone: string;
  reference: string;
  symbol: string;
  label: string;
}) {
  const colors = stoneColors[tone as keyof typeof stoneColors];
  return (
    <figure className="mb-6 flex items-center gap-5 rounded-2xl bg-background p-4">
      <svg viewBox="0 0 140 90" aria-hidden="true" className="w-24 shrink-0">
        <ellipse cx="70" cy="79" rx="55" ry="5" fill="var(--border)" />
        <path
          d="M8 53 C0 18 130 14 132 52 C144 78 7 86 8 53 Z"
          fill={colors?.fill ?? 'var(--secondary)'}
        />
        <ellipse cx="51" cy="37" rx="24" ry="6" fill="white" opacity=".3" />
        <text x="70" y="62" textAnchor="middle" fontSize="25">
          {symbol}
        </text>
      </svg>
      <figcaption className="min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-teal">{label}</p>
        <p className="my-2 line-clamp-2 break-words font-serif text-lg">{memory || '…'}</p>
        <p className="text-xs text-muted-foreground">{reference}</p>
      </figcaption>
    </figure>
  );
}
