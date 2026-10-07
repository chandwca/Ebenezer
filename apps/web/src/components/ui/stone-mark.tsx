import { cn } from '@/lib/utils';

export function StoneMark({ className }: { className?: string }) {
  return (
    <img
      src="/icon-512.png"
      alt=""
      aria-hidden="true"
      width={512}
      height={512}
      className={cn('size-10 shrink-0 rounded-xl', className)}
    />
  );
}
