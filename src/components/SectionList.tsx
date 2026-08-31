import type { Section } from "@/data/previas";
import { DocLink } from "./DocLink";

function TextBlock({ text, href }: { text: string; href?: string | undefined }) {
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)] transition-colors hover:bg-primary-dark"
      >
        {text}
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
    );
  }
  return <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>;
}

export function SectionList({ sections }: { sections: Section[] }) {
  return (
    <div className="space-y-8">
      {sections.map((section, i) => (
        <section key={`${section.title}-${i}`} className="card-soft scroll-mt-24 p-5 sm:p-7">
          <header className="border-b border-border pb-4">
            <h2 className="text-xl font-semibold uppercase tracking-wide text-primary sm:text-2xl">
              {section.title}
            </h2>
            {section.subtitle ? (
              <p className="mt-1 text-sm text-muted-foreground">{section.subtitle}</p>
            ) : null}
          </header>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {section.items
              .filter((it) => it.type === "file")
              .map((it) => (
                <DocLink key={it.id + it.label} item={it} />
              ))}
          </div>

          <div className="mt-4 flex flex-col items-start gap-3">
            {section.items
              .filter((it) => it.type === "text")
              .map((it, j) => (
                <TextBlock key={j} text={it.text} href={it.href} />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
