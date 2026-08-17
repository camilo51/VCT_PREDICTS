export function SectionCard({
  title,
  eyebrow,
  children,
  className = "",
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-border bg-bg-elevated p-5 ${className}`}>
      {eyebrow && <div className="mb-1 text-[11px] uppercase tracking-wide text-text-faint">{eyebrow}</div>}
      <h2 className="mb-4 font-display text-lg tracking-wide text-text">{title}</h2>
      {children}
    </section>
  );
}
