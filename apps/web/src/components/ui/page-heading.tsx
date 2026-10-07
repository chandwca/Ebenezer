export type HeadingProps = { eyebrow: string; title: string; description: string };

export function PageHeading({ eyebrow, title, description }: HeadingProps) {
  return (
    <div className="mb-8">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[.18em] text-teal">{eyebrow}</p>
      <h1 className="font-display text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-xl leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}
