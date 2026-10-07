import * as React from 'react';
import { qrCode } from '@/lib/qr';

export function QrCode({ value, label }: { value: string; label: string }) {
  const code = React.useMemo(() => qrCode(value), [value]);
  const quiet = 3;
  const size = code.size + quiet * 2;
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      className="mx-auto block w-full max-w-64 rounded-2xl bg-white"
    >
      <path d={code.path} transform={`translate(${quiet} ${quiet})`} fill="#04212e" />
    </svg>
  );
}
