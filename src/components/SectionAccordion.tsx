import { useState } from "react";

import { DocCard } from "./DocCard";
import type { Section } from "@/data/site";

function slugOf(title: string, index: number) {
  const s = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `sec-${s || index}`;
}

function SectionPanel({ section, index }: { section: Section; index: number }) {
  const [open, setOpen] = useState(false);
  const id = slugOf(section.title, index);
  const files = section.items.filter((i) => i.type === "file");
  const texts = section.items.filter((i) => i.type === "text");

  return (
    <section className="card section accordion" id={id}>
      <button
        type="button"
        className="acc-trigger"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => setOpen((v) => !v)}
      >
        <span>
          <h2>{section.title}</h2>
          {section.subtitle ? <span className="acc-sub">{section.subtitle}</span> : null}
        </span>
        <span className="acc-meta">
          {files.length ? (
            <span className="acc-count">
              {files.length} {files.length === 1 ? "archivo" : "archivos"}
            </span>
          ) : null}
          <svg
            className="acc-chevron"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      {open ? (
        <div className="acc-panel" id={`${id}-panel`}>
          {files.length ? (
            <div className="doc-grid">
              {files.map((f) => (
                <DocCard key={f.id} item={f} />
              ))}
            </div>
          ) : null}

          {texts.length ? (
            <div className="links">
              {texts.map((t, i) =>
                t.href ? (
                  <a
                    key={i}
                    className="btn-link"
                    href={t.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t.text}
                    <svg
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M7 17 17 7M9 7h8v8" />
                    </svg>
                  </a>
                ) : (
                  <p key={i} className="note">
                    {t.text}
                  </p>
                ),
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function SectionAccordion({ sections }: { sections: Section[] }) {
  return (
    <>
      {sections.map((section, i) => (
        <SectionPanel key={section.title + i} section={section} index={i} />
      ))}
    </>
  );
}
