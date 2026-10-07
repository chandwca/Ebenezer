import { useTranslation } from 'react-i18next';
import { stoneSymbol } from '@/lib/scripture';
import { Card } from './card';
import { Button } from './button';
import { stoneColors, type StoneItem } from './stone-appearance';

export function StoneTower<T extends StoneItem>({
  stones,
  onOpen,
}: {
  stones: T[];
  onOpen: (stone: T) => void;
}) {
  const { t, i18n } = useTranslation('journal');
  const ordered = [...stones].sort(
    (a, b) =>
      a.journalDate.localeCompare(b.journalDate) ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.id.localeCompare(b.id),
  );
  const height = Math.max(260, ordered.length * 42 + 65);
  const date = new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'long' });
  return (
    <Card className="overflow-hidden rounded-3xl p-5 sm:p-7">
      <div className="mx-auto max-w-lg">
        <div className="grid grid-cols-3 text-xs font-semibold text-muted-foreground">
          <span>{t('tower.hardDays')}</span>
          <span className="text-center">{t('tower.mixedDays')}</span>
          <span className="text-right">{t('tower.brightDays')}</span>
        </div>
        <div className="mt-4 max-h-[65dvh] overflow-y-auto rounded-xl">
          <svg
            viewBox={`0 0 360 ${height}`}
            className="block w-full"
            role="group"
            aria-label={t('tower.label')}
          >
            <line
              x1={180}
              x2={180}
              y1={14}
              y2={height - 22}
              stroke="currentColor"
              opacity={0.12}
              strokeWidth={2}
            />
            <ellipse cx={180} cy={height - 14} rx={140} ry={8} fill="currentColor" opacity={0.12} />
            {ordered.map((stone, index) => {
              const tone = stone.tone as keyof typeof stoneColors;
              const offset = tone === 'hard' ? -50 : tone === 'bright' ? 50 : 0;
              const x = 180 + offset + (((index * 17) % 9) - 4);
              const y = height - 34 - index * 42;
              const width = 100 - ((index * 13) % 20);
              const rotation = ((index * 29) % 11) - 5;
              const label = t('tower.open', {
                date: date.format(new Date(`${stone.journalDate}T12:00:00`)),
                tone: t(`tones.${tone}`),
                reference: stone.ref,
                memory: stone.memory,
              });
              return (
                <g
                  key={stone.id}
                  role="button"
                  tabIndex={0}
                  aria-label={label}
                  className="cursor-pointer outline-none [&:focus-visible>path]:stroke-gold [&:focus-visible>path]:stroke-[3] hover:opacity-85"
                  transform={`rotate(${rotation} ${x} ${y})`}
                  onClick={() => onOpen(stone)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onOpen(stone);
                    }
                  }}
                >
                  <title>{label}</title>
                  <path
                    d={`M${x - width / 2} ${y} C${x - width / 2} ${y - 18},${x + width / 2 - 6} ${y - 19},${x + width / 2} ${y - 2} C${x + width / 2 + 2} ${y + 14},${x - width / 2 + 8} ${y + 16},${x - width / 2} ${y} Z`}
                    fill={stoneColors[tone].fill}
                    stroke="var(--border)"
                    strokeWidth={0.6}
                  />
                  <ellipse
                    cx={x - width * 0.14}
                    cy={y - 7}
                    rx={width * 0.18}
                    ry={4}
                    fill="#FFFFFF"
                    opacity={0.25}
                  />
                  <text x={x} y={y + 6} textAnchor="middle" fontSize={17} aria-hidden="true">
                    {stoneSymbol(stone.ref)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <p className="mb-5 mt-3 text-center text-xs text-muted-foreground">
          {t('tower.order', { count: stones.length })}
        </p>
        <Button className="w-full" onClick={() => onOpen(ordered[ordered.length - 1])}>
          {t('tower.remember')}
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">{t('tower.latest')}</p>
      </div>
    </Card>
  );
}
