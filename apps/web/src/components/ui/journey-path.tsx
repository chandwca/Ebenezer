import * as React from 'react';
import { cn } from '@/lib/utils';

const SPAN = 70;
const BASE = 60;
const LIFT = 20;

/** Presentational progress only: moving forward still goes through step validation. */
export function JourneyPath({ steps, current }: { steps: string[]; current: number }) {
  const clipId = React.useId();
  const width = steps.length * SPAN;
  const wave = `M0 ${BASE} Q${SPAN / 2} ${BASE - LIFT} ${SPAN} ${BASE} ${steps
    .slice(1)
    .map((_, index) => `T${(index + 2) * SPAN} ${BASE}`)
    .join(' ')}`;
  // Each segment's midpoint sits half the control lift above or below the baseline.
  const stoneY = (index: number) => BASE + (index % 2 ? LIFT / 2 : -LIFT / 2);
  const progress = SPAN / 2 + current * SPAN;
  return (
    <div>
      <svg viewBox={`0 32 ${width} 56`} aria-hidden="true" className="w-full overflow-visible">
        <defs>
          <clipPath id={`${clipId}-trail`}>
            <rect x={SPAN / 2} y="0" height="120" width={width - SPAN} />
          </clipPath>
          <clipPath id={`${clipId}-walked`}>
            <rect
              x={SPAN / 2}
              y="0"
              height="120"
              width={progress - SPAN / 2}
              className="transition-[width] duration-500 ease-out motion-reduce:transition-none"
            />
          </clipPath>
        </defs>
        <path
          d={wave}
          fill="none"
          stroke="var(--muted-foreground)"
          strokeOpacity=".4"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="0 8"
          clipPath={`url(#${clipId}-trail)`}
        />
        <path
          d={wave}
          fill="none"
          stroke="var(--teal)"
          strokeWidth="4"
          strokeLinecap="round"
          clipPath={`url(#${clipId}-walked)`}
        />
        {steps.map((_, index) => {
          const cx = SPAN / 2 + index * SPAN;
          const cy = stoneY(index);
          const done = index < current;
          const active = index === current;
          return (
            <g key={index}>
              {active && (
                <ellipse
                  cx={cx}
                  cy={cy}
                  rx="27"
                  ry="18"
                  fill="var(--gold)"
                  opacity=".22"
                  className="origin-center animate-pulse [transform-box:fill-box] motion-reduce:animate-none"
                />
              )}
              <ellipse
                cx={cx}
                cy={cy + 2.5}
                rx="20"
                ry="12.5"
                fill={done ? 'var(--teal)' : active ? 'var(--gold)' : 'var(--border)'}
                opacity={done || active ? 0.45 : 0.8}
              />
              <ellipse
                cx={cx}
                cy={cy}
                rx="20"
                ry="12.5"
                fill={done ? 'var(--teal)' : active ? 'var(--gold)' : 'var(--card)'}
                stroke={done ? 'var(--teal)' : active ? 'var(--gold)' : 'var(--border)'}
                strokeWidth="1.5"
                className="transition-[fill,stroke] duration-300 motion-reduce:transition-none"
              />
              {done ? (
                <path
                  d={`M${cx - 5} ${cy} l3.5 3.5 l6.5 -7`}
                  fill="none"
                  stroke="var(--card)"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : (
                <text
                  x={cx}
                  y={cy}
                  dy=".35em"
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill={active ? 'var(--gold-foreground)' : 'var(--muted-foreground)'}
                >
                  {index + 1}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <ol className="mt-1 grid grid-flow-col auto-cols-fr gap-1 text-center text-[10px] sm:text-xs">
        {steps.map((step, index) => (
          <li
            key={index}
            aria-current={index === current ? 'step' : undefined}
            className={cn(
              'break-words text-muted-foreground transition-colors',
              index < current && 'text-teal',
              index === current && 'font-semibold text-foreground',
            )}
          >
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}
