import * as React from 'react';
import { cn } from '@/lib/utils';

export type StripDay = { key: string; label: string; state: 'open' | 'today' | 'locked' };

export function PackStrip({ days, label }: { days: StripDay[]; label: string }) {
  const uid = React.useId().replace(/:/g, '');
  return (
    <ol
      aria-label={label}
      className="night-sky relative grid grid-cols-5 gap-1 overflow-hidden rounded-3xl border border-white/10 px-3 pb-4 pt-6 text-white shadow-[0_24px_60px_-28px_#00e0c6aa]"
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-6 top-[3.35rem] h-px bg-linear-to-r from-transparent via-white/25 to-transparent"
      />
      {days.map((day, index) => (
        <li key={day.key} className="relative flex flex-col items-center gap-2">
          <svg
            viewBox="0 0 64 44"
            className="h-11 w-full max-w-16 overflow-visible"
            aria-hidden="true"
          >
            <defs>
              <radialGradient id={`${uid}-gold`} cx="32%" cy="22%" r="95%">
                <stop offset="0%" stopColor="#fff1b8" />
                <stop offset="45%" stopColor="#ffb627" />
                <stop offset="100%" stopColor="#c46a10" />
              </radialGradient>
              <radialGradient id={`${uid}-teal`} cx="32%" cy="22%" r="95%">
                <stop offset="0%" stopColor="#b8fff0" />
                <stop offset="45%" stopColor="#00e0c6" />
                <stop offset="100%" stopColor="#0a7a6c" />
              </radialGradient>
              <filter id={`${uid}-glow`} x="-60%" y="-90%" width="220%" height="280%">
                <feGaussianBlur stdDeviation="5" />
              </filter>
            </defs>
            {day.state === 'locked' ? (
              <ellipse
                cx="32"
                cy="24"
                rx="22"
                ry="12"
                fill="none"
                stroke="#fff"
                strokeOpacity="0.35"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
            ) : (
              <>
                {day.state === 'today' && (
                  <ellipse
                    cx="32"
                    cy="24"
                    rx="22"
                    ry="12"
                    fill="#ffb627"
                    filter={`url(#${uid}-glow)`}
                    className="motion-safe:animate-[stone-pulse_2.8s_ease-in-out_infinite]"
                  />
                )}
                <ellipse
                  cx="32"
                  cy="24"
                  rx="22"
                  ry="12"
                  fill={`url(#${uid}-${day.state === 'today' ? 'gold' : 'teal'})`}
                  stroke="#fff"
                  strokeOpacity="0.55"
                  strokeWidth="1"
                />
                <ellipse cx="25" cy="19" rx="9" ry="3.5" fill="#fff" opacity="0.4" />
              </>
            )}
          </svg>
          <span
            className={cn(
              'text-[11px] font-semibold uppercase tracking-wider',
              day.state === 'today' ? 'text-gold' : 'text-white/60',
            )}
          >
            {day.label}
          </span>
          <span className="sr-only">{index + 1}</span>
        </li>
      ))}
    </ol>
  );
}
