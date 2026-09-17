// Day 1: thin, opt-in wrapper for Office Portal pages.
// Not applied globally — existing /admin/* pages keep their current layout.
// New pages or refactors can adopt it progressively.

import type { ReactNode } from "react";

interface Props {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}

export default function OfficePortalLayout({ title, subtitle, children }: Props) {
  return (
    <div className="min-h-screen bg-background">
      {(title || subtitle) && (
        <header className="border-b bg-white">
          <div className="mx-auto max-w-6xl px-4 py-4">
            {title && <h1 className="text-lg font-semibold text-foreground">{title}</h1>}
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </header>
      )}
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
