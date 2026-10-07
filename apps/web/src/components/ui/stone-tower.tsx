import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Card } from './card';
import { Button } from './button';
import { stoneColors, type StoneItem } from './stone-appearance';

const WIDTH = 360;
const CENTER = 205;
const RAIL = 26;
const tones = ['hard', 'mixed', 'bright'] as const;
type Tone = (typeof tones)[number];

/** Earthy versions of the tone colors, so stones read as rock rather than buttons. */
const shade = (tone: Tone, mix: string) =>
  `color-mix(in oklch, ${stoneColors[tone].fill} ${mix}, #b4a993)`;

/** Small deterministic noise from a stone's id, so each stone keeps its shape between visits. */
function seeded(id: string) {
  let hash = 2166136261;
  for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (salt: number) => (((Math.imul(hash ^ salt, 2654435761) >>> 0) % 1000) / 1000) * 2 - 1;
}

/** All the reflection fields add together: a single line is a pebble, a long night is a boulder. */
function stoneWidth(stone: StoneItem) {
  const written = [
    stone.memory,
    stone.stood,
    stone.learned,
    stone.questions,
    stone.thoughts,
    stone.prayer,
    stone.partner,
  ].join('').length;
  return 100 + 120 * Math.min(1, Math.sqrt(written / 900));
}

/** A flat-bottomed, round-shouldered pebble built from four cubic curves. */
function stonePath(x: number, y: number, w: number, h: number, noise: (salt: number) => number) {
  const k = 0.5523;
  const rx = w / 2;
  const up = h * (0.5 + 0.04 * noise(1));
  const down = h * 0.4;
  const lean = w * 0.08 * noise(3);
  const left = x - rx;
  const right = x + rx;
  const mid = y + h * 0.04;
  return [
    `M${left} ${mid}`,
    `C${left} ${mid - up * k},${x + lean - rx * k} ${y - up},${x + lean} ${y - up}`,
    `C${x + lean + rx * k} ${y - up},${right} ${mid - up * k},${right} ${mid}`,
    `C${right} ${mid + down * k * 0.9},${x + rx * k * 1.1} ${y + down},${x} ${y + down}`,
    `C${x - rx * k * 1.1} ${y + down},${left} ${mid + down * k * 0.9},${left} ${mid}`,
    'Z',
  ].join(' ');
}

export function StoneTower<T extends StoneItem>({
  stones,
  onOpen,
}: {
  stones: T[];
  onOpen: (stone: T) => void;
}) {
  const { t, i18n } = useTranslation('journal');
  const uid = useId().replace(/:/g, '');
  const ordered = [...stones].sort(
    (a, b) =>
      a.journalDate.localeCompare(b.journalDate) ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.id.localeCompare(b.id),
  );
  const date = new Intl.DateTimeFormat(i18n.resolvedLanguage, {
    dateStyle: 'long',
  });
  const now = new Date();
  const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
  const placedToday = ordered.some((stone) => stone.journalDate === today);

  // Stack from the ground up: each stone rests a little into the one beneath it.
  let top = 0;
  let lastX = CENTER;
  const laid = ordered.map((stone) => {
    const noise = seeded(stone.id);
    const tone = (tones.includes(stone.tone as Tone) ? stone.tone : 'mixed') as Tone;
    const w = stoneWidth(stone);
    const h = Math.max(36, w * 0.4);
    const y = top - h / 2 + (top === 0 ? 0 : h * 0.16);
    const x = Math.max(CENTER - 22, Math.min(CENTER + 22, lastX + noise(5) * 14));
    top = y - h / 2;
    lastX = x;
    return { stone, noise, tone, w, h, x, y, rotation: noise(6) * 4 };
  });
  const height = Math.max(240, -top + 44);
  const ground = height - 20;
  let previousYear = '';

  return (
    <Card className="overflow-hidden rounded-3xl border-border/60 bg-[radial-gradient(120%_80%_at_50%_0%,var(--card),var(--muted))] p-5 sm:p-7">
      <div className="mx-auto max-w-lg">
        <ul className="flex flex-wrap justify-center gap-2">
          {tones.map((tone) => (
            <li
              key={tone}
              className="inline-flex items-center gap-2 rounded-full bg-card/80 px-3 py-1.5 text-xs font-medium text-muted-foreground ring-1 ring-border/60"
            >
              <span
                aria-hidden="true"
                className="h-2.5 w-4 rounded-[50%] shadow-[inset_0_-1px_1px_#0003]"
                style={{
                  background: `radial-gradient(circle at 35% 30%, ${shade(tone, '35%')}, ${shade(tone, '70%')})`,
                }}
              />
              {t(`tower.${tone}Days`)}
            </li>
          ))}
        </ul>

        <div className="mt-5 max-h-[65dvh] overflow-y-auto rounded-2xl">
          {!placedToday && (
            <div className="flex flex-col items-center gap-2 pb-2 pl-6">
              <span className="text-xs font-medium text-muted-foreground">{t('tower.today')}</span>
              <Link
                to="/reflection"
                aria-label={t('tower.setToday')}
                className="grid h-14 w-36 place-items-center rounded-[50%] border-2 border-dashed border-muted-foreground/30 text-muted-foreground/60 transition-colors hover:border-gold hover:text-gold"
              >
                <Plus aria-hidden="true" className="size-5" />
              </Link>
            </div>
          )}
          <svg
            viewBox={`0 0 ${WIDTH} ${height}`}
            className="block w-full overflow-visible"
            role="group"
            aria-label={t('tower.label')}
          >
            <defs>
              {tones.map((tone) => (
                <radialGradient key={tone} id={`${uid}-${tone}`} cx="34%" cy="22%" r="85%">
                  <stop offset="0%" stopColor={shade(tone, '30%')} />
                  <stop offset="55%" stopColor={shade(tone, '58%')} />
                  <stop offset="100%" stopColor={shade(tone, '82%')} />
                </radialGradient>
              ))}
              <filter id={`${uid}-grain`} x="0" y="0" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves={2} seed={7} />
                <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.16 0" />
                <feComposite in2="SourceGraphic" operator="in" />
              </filter>
              <filter id={`${uid}-soft`} x="-30%" y="-100%" width="160%" height="300%">
                <feGaussianBlur stdDeviation="4" />
              </filter>
            </defs>

            <line
              x1={RAIL}
              x2={RAIL}
              y1={ground + top}
              y2={ground}
              stroke="currentColor"
              opacity={0.12}
              strokeWidth={1.5}
            />
            <ellipse
              cx={CENTER}
              cy={ground + 4}
              rx={150}
              ry={10}
              fill="currentColor"
              opacity={0.07}
              filter={`url(#${uid}-soft)`}
            />

            {laid.map(({ stone, noise, tone, w, h, x, y, rotation }, index) => {
              const cy = ground + y;
              const year = stone.journalDate.slice(0, 4);
              const showYear = year !== previousYear;
              previousYear = year;
              const path = stonePath(x, cy, w, h, noise);
              const latest = index === laid.length - 1;
              const label = t('tower.open', {
                date: date.format(new Date(`${stone.journalDate}T12:00:00`)),
                tone: t(`tones.${tone}`),
                reference: stone.ref,
                memory: stone.memory,
              });
              return (
                <g key={stone.id}>
                  <circle cx={RAIL} cy={cy} r={3.5} fill={shade(tone, '70%')} />
                  {showYear && (
                    <text
                      x={RAIL + 10}
                      y={cy + 4}
                      fontSize={11}
                      fontWeight={600}
                      fill="currentColor"
                      opacity={0.55}
                    >
                      {year}
                    </text>
                  )}
                  <g
                    className={
                      latest
                        ? 'motion-safe:animate-[stone-settle_1.1s_cubic-bezier(.3,.7,.4,1)_both]'
                        : undefined
                    }
                  >
                    <g
                      role="button"
                      tabIndex={0}
                      aria-label={label}
                      className="group cursor-pointer outline-none transition-transform duration-300 ease-out hover:-translate-y-1 focus-visible:-translate-y-1 motion-reduce:transition-none"
                      onClick={() => onOpen(stone)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onOpen(stone);
                        }
                      }}
                    >
                      <title>{label}</title>
                      <g transform={`rotate(${rotation} ${x} ${cy})`}>
                        <ellipse
                          cx={x + 4}
                          cy={cy + h * 0.42}
                          rx={w * 0.42}
                          ry={h * 0.16}
                          fill="#1a2a30"
                          opacity={0.28}
                          filter={`url(#${uid}-soft)`}
                        />
                        <path d={path} fill={`url(#${uid}-${tone})`} />
                        <path d={path} filter={`url(#${uid}-grain)`} fill="#000" />
                        <path
                          d={path}
                          fill="none"
                          stroke={shade(tone, '100%')}
                          strokeOpacity={0.35}
                          strokeWidth={1.2}
                          className="transition-[stroke,stroke-width] group-focus-visible:stroke-gold group-focus-visible:stroke-[3] group-focus-visible:[stroke-opacity:1]"
                        />
                        <ellipse
                          cx={x - w * 0.16}
                          cy={cy - h * 0.24}
                          rx={w * 0.2}
                          ry={h * 0.1}
                          fill="#fff"
                          opacity={0.16}
                          filter={`url(#${uid}-soft)`}
                        />
                      </g>
                    </g>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>
        <p className="mb-5 mt-4 text-center text-xs text-muted-foreground">
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
