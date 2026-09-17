import type { ReactNode } from "react";
import GovHeader from "@/components/GovHeader";
import GovFooter from "@/components/GovFooter";

/** Optional wrapper for future pages that want the government chrome. Existing routes are unaffected. */
export default function GovLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <GovHeader />
      <main className="flex-1">{children}</main>
      <GovFooter />
    </>
  );
}