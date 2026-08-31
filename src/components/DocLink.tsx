import { useState } from "react";

import type { DocItem } from "@/data/previas";

const EXT_LABEL: Record<string, string> = {
  pdf: "PDF",
  doc: "DOC",
  docx: "DOC",
  xls: "XLS",
  xlsx: "XLS",
  ppt: "PPT",
  pptx: "PPT",
};

function extOf(name: string) {
  const raw = name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_LABEL[raw] ?? "DOC";
}

export function DocLink({ item }: { item: DocItem }) {
  const ext = extOf(item.name);
  const [failed, setFailed] = useState(false);

  return (
    <a
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-soft hover:shadow-[var(--shadow-lift)]"
      href={`https://drive.google.com/file/d/${item.id}/view`}
      target="_blank"
      rel="noopener noreferrer"
    >
      {/* Portada del documento */}
      {failed ? (
        <div className="flex h-36 items-center justify-center bg-accent">
          <span className="text-2xl font-bold tracking-widest text-accent-foreground/60">
            {ext}
          </span>
        </div>
      ) : (
        <img
          src={`https://drive.google.com/thumbnail?id=${item.id}&sz=w480`}
          alt={`Portada de ${item.label}`}
          loading="lazy"
          className="h-36 w-full bg-muted object-cover object-top"
          onError={() => setFailed(true)}
        />
      )}

      <div className="flex items-center gap-3 border-t border-border p-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent text-[0.65rem] font-bold tracking-wide text-accent-foreground">
          {ext}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground group-hover:text-primary">
            {item.label}
          </span>
          <span className="block truncate text-xs text-muted-foreground">{item.name}</span>
        </span>
        <svg
          className="h-4 w-4 shrink-0 text-primary-soft transition-transform group-hover:translate-x-0.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </a>
  );
}
