export type HeadingProps = { eyebrow: string; title: string; description: string };

export function PageHeading({
  eyebrow,
  title,
  description,
  hidden = false,
}: Pick<HeadingProps, 'title'> &
  Partial<Pick<HeadingProps, 'eyebrow' | 'description'>> & { hidden?: boolean }) {
  if (hidden) return <h1 className="sr-only">{title}</h1>;
  return (
    <div className="mb-6">
      {eyebrow && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-teal">{eyebrow}</p>
      )}
      <h1 className="font-display text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl">
        {title}
      </h1>
      {description && (
        <p className="mt-3 max-w-xl leading-relaxed text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
