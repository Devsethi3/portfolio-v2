type SectionHeadingProps = {
  eyebrow: string
  title: string
  description?: string
  headingId?: string
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  headingId,
}: SectionHeadingProps) {
  return (
    <div className="mb-8 space-y-2">
      <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
        {eyebrow}
      </p>
      <h2
        id={headingId}
        className="text-2xl font-medium tracking-tight sm:text-3xl"
      >
        {title}
      </h2>
      {description ? (
        <p className="max-w-xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  )
}
