import React from "react";
import { Helmet } from "react-helmet-async";
import { BackButton } from "@/components/BackButton";
import AdminAuthChecklist from "@/components/admin/AdminAuthChecklist";
import { ShieldCheck } from "lucide-react";

export default function AdminAuthChecklistPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4 py-8">
      <Helmet>
        <title>Auth Verification Matrix — Bagula II GP Admin</title>
      </Helmet>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <BackButton fallbackUrl="/admin/manage" label="👥 Manage Admins" className="-ml-2 text-xs" />
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-primary" />
            <span>Bagula II GP · Super Admin Security Audit</span>
          </span>
        </div>

        <AdminAuthChecklist />
      </div>
    </div>
  );
}
