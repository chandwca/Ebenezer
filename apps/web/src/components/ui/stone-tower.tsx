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

const light = (tone: Tone, share: string) =>
  `color-mix(in oklch, ${stoneColors[tone].fill} ${share}, white)`;
const deep = (tone: Tone, share: string) =>
  `color-mix(in oklch, ${stoneColors[tone].fill} ${share}, #020d14)`;

const STAR_COUNT = 34;

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
  return 124 + 120 * Math.min(1, Math.sqrt(written / 900));
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
  const height = Math.max(430, -top + 70);
  const ground = height - 20;
  const sky = seeded('night-sky');
  const stars = Array.from({ length: STAR_COUNT }, (_, index) => ({
    x: (sky(index * 3 + 1) + 1) / 2,
    y: (sky(index * 3 + 2) + 1) / 2,
    r: 0.6 + ((sky(index * 3 + 3) + 1) / 2) * 1.4,
    delay: ((sky(index + 90) + 1) / 2) * 3,
  }));
  const embers = Array.from({ length: 7 }, (_, index) => ({
    dx: sky(index + 200) * 46,
    r: 1.4 + ((sky(index + 300) + 1) / 2) * 1.6,
    delay: index * 0.65,
  }));
  let previousYear = '';

  return (
    <Card className="night-sky relative -mx-5 overflow-hidden rounded-none border-x-0 border-white/10 p-4 text-white shadow-[0_30px_80px_-30px_#00e0c6aa] sm:mx-0 sm:rounded-3xl sm:border-x sm:p-7">
      <div className="mx-auto max-w-xl">
        <ul className="flex flex-wrap justify-center gap-2" hidden={ordered.length === 0}>
          {tones.map((tone) => (
            <li
              key={tone}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 ring-1 ring-white/15 backdrop-blur"
            >
              <span
                aria-hidden="true"
                className="h-2.5 w-4 rounded-[50%]"
                style={{
                  background: `radial-gradient(circle at 35% 30%, ${light(tone, '40%')}, ${stoneColors[tone].fill})`,
                  boxShadow: `0 0 10px ${stoneColors[tone].fill}`,
                }}
              />
              {t(`tower.${tone}Days`)}
            </li>
          ))}
        </ul>

        <div className="mt-5 max-h-[74dvh] overflow-y-auto rounded-2xl">
          {!placedToday && (
            <div className="flex flex-col items-center gap-2 pb-2 pl-6">
              <span className="text-xs font-medium text-white/70">{t('tower.today')}</span>
              <Link
                to="/reflection"
                aria-label={t('tower.setToday')}
                className="grid h-14 w-36 place-items-center rounded-[50%] border-2 border-dashed border-white/30 text-white/60 shadow-[0_0_24px_-6px_var(--gold)] transition-colors hover:border-gold hover:text-gold"
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
                <radialGradient key={tone} id={`${uid}-${tone}`} cx="32%" cy="20%" r="95%">
                  <stop offset="0%" stopColor={light(tone, '38%')} />
                  <stop offset="38%" stopColor={stoneColors[tone].fill} />
                  <stop offset="100%" stopColor={deep(tone, '52%')} />
                </radialGradient>
              ))}
              <radialGradient id={`${uid}-beam`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffd98a" stopOpacity="0.38" />
                <stop offset="100%" stopColor="#ffd98a" stopOpacity="0" />
              </radialGradient>
              <filter id={`${uid}-grain`} x="0" y="0" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="1.8" numOctaves={2} seed={7} />
                <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.1 0" />
                <feComposite in2="SourceGraphic" operator="in" />
              </filter>
              <filter id={`${uid}-soft`} x="-30%" y="-100%" width="160%" height="300%">
                <feGaussianBlur stdDeviation="4" />
              </filter>
              <filter id={`${uid}-glow`} x="-60%" y="-90%" width="220%" height="280%">
                <feGaussianBlur stdDeviation="11" />
              </filter>
            </defs>

            <g aria-hidden="true">
              {stars.map((star, index) => (
                <circle
                  key={index}
                  cx={star.x * WIDTH}
                  cy={star.y * height}
                  r={star.r}
                  fill="#fff"
                  className="motion-safe:animate-[star-twinkle_3.2s_ease-in-out_infinite]"
                  style={{ animationDelay: `${star.delay}s` }}
                />
              ))}
              <circle cx={CENTER} cy={ground + top - 24} r={140} fill={`url(#${uid}-beam)`} />
              {embers.map((ember, index) => (
                <circle
                  key={index}
                  cx={CENTER + ember.dx}
                  cy={ground + top + 6}
                  r={ember.r}
                  fill="#ffd98a"
                  opacity={0}
                  className="motion-safe:animate-[ember-rise_4.5s_ease-out_infinite]"
                  style={{ animationDelay: `${ember.delay}s` }}
                />
              ))}
            </g>
            <line
              x1={RAIL}
              x2={RAIL}
              y1={ground + top}
              y2={ground}
              stroke="#ffffff"
              opacity={0.16}
              strokeWidth={1.5}
            />
            <ellipse
              cx={CENTER}
              cy={ground + 4}
              rx={150}
              ry={12}
              fill="#00e0c6"
              opacity={0.45}
              filter={`url(#${uid}-glow)`}
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
                  <circle
                    cx={RAIL}
                    cy={cy}
                    r={3.5}
                    fill={stoneColors[tone].fill}
                    style={{ filter: `drop-shadow(0 0 4px ${stoneColors[tone].fill})` }}
                  />
                  {showYear && (
                    <text
                      x={RAIL + 10}
                      y={cy + 4}
                      fontSize={11}
                      fontWeight={600}
                      fill="#ffffff"
                      opacity={0.6}
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
                        <path
                          d={path}
                          fill={stoneColors[tone].fill}
                          opacity={latest ? undefined : 0.4}
                          filter={`url(#${uid}-glow)`}
                          className={
                            latest
                              ? 'motion-safe:animate-[stone-pulse_2.8s_ease-in-out_infinite]'
                              : undefined
                          }
                        />
                        <path d={path} fill={`url(#${uid}-${tone})`} />
                        <path d={path} filter={`url(#${uid}-grain)`} fill="#000" />
                        <path
                          d={stonePath(x, cy - h * 0.04, w * 0.7, h * 0.62, noise)}
                          fill={light(tone, '30%')}
                          opacity={0.2}
                        />
                        <path
                          d={path}
                          fill="none"
                          stroke={light(tone, '45%')}
                          strokeOpacity={0.75}
                          strokeWidth={1.2}
                          className="transition-[stroke,stroke-width] group-focus-visible:stroke-gold group-focus-visible:stroke-[3] group-focus-visible:[stroke-opacity:1]"
                        />
                        <ellipse
                          cx={x - w * 0.16}
                          cy={cy - h * 0.24}
                          rx={w * 0.2}
                          ry={h * 0.1}
                          fill="#fff"
                          opacity={0.42}
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
        {ordered.length > 0 && (
          <Button
            variant="gold"
            className="mt-5 w-full"
            onClick={() => onOpen(ordered[ordered.length - 1])}
          >
            {t('tower.remember')}
          </Button>
        )}
      </div>
    </Card>
  );
}
