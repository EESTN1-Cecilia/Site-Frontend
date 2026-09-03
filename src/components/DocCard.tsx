import { useState } from "react";

import type { DocItem } from "@/data/site";

const EXT: Record<string, string> = {
  pdf: "PDF",
  doc: "DOC",
  docx: "DOC",
  xls: "XLS",
  xlsx: "XLS",
  ppt: "PPT",
  pptx: "PPT",
};

function extOf(name: string) {
  const raw = String(name || "").split(".").pop()?.toLowerCase() ?? "";
  return EXT[raw] ?? "DOC";
}

export function DocCard({ item }: { item: DocItem }) {
  const ext = extOf(item.name);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const src =
    step === 0
      ? `/api/public/thumb?id=${item.id}`
      : `https://drive.google.com/thumbnail?id=${item.id}&sz=w480`;

  return (
    <a
      className="doc"
      href={`https://drive.google.com/file/d/${item.id}/view`}
      target="_blank"
      rel="noopener noreferrer"
    >
      {step < 2 ? (
        <img
          className="doc-cover"
          loading="lazy"
          alt={`Portada de ${item.label}`}
          src={src}
          onError={() => setStep((s) => (s === 0 ? 1 : 2))}
        />
      ) : (
        <div className="doc-cover-fallback">{ext}</div>
      )}
      <div className="doc-body">
        <span className="doc-ext">{ext}</span>
        <span className="doc-text">
          <span className="doc-label">{item.label}</span>
          <span className="doc-name">{item.name}</span>
        </span>
        <svg
          className="doc-arrow"
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
      </div>
    </a>
  );
}
