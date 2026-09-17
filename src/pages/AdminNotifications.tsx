import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { toast } from "sonner";

interface NotifRow {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  action_label: string | null;
  action_href: string | null;
  read_at: string | null;
  created_at: string;
}

const KIND_META: Record<string, { emoji: string; label: string }> = {
  application_returned: { emoji: "🔄", label: "Returned application" },
  certificate_issued: { emoji: "📜", label: "Certificate issued" },
  new_notice: { emoji: "📢", label: "New notice" },
  system_alert: { emoji: "⚠️", label: "System alert" },
  public_draft: { emoji: "📝", label: "Public draft" },
  general: { emoji: "🔔", label: "Notification" },
};

export default function AdminNotifications() {
  const [rows, setRows] = useState<NotifRow[] | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const load = async () => {
    const { data } = await supabase
      .from("office_notifications" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setRows((data ?? []) as unknown as NotifRow[]);
  };

  useEffect(() => {
    load();
  }, []);

  const markRead = async (id: string) => {
    const { error } = await supabase
      .from("office_notifications" as never)
      .update({ read_at: new Date().toISOString() } as never)
      .eq("id", id);
    if (error) return toast.error(error.message);
    setRows((prev) => prev?.map((r) => (r.id === id ? { ...r, read_at: new Date().toISOString() } : r)) ?? null);
  };

  const markAllRead = async () => {
    const unread = (rows ?? []).filter((r) => !r.read_at).map((r) => r.id);
    if (unread.length === 0) return;
    const { error } = await supabase
      .from("office_notifications" as never)
      .update({ read_at: new Date().toISOString() } as never)
      .in("id", unread);
    if (error) return toast.error(error.message);
    load();
  };

  const visible = (rows ?? []).filter((r) => (filter === "unread" ? !r.read_at : true));
  const unreadCount = (rows ?? []).filter((r) => !r.read_at).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-5">
        <BackButton fallbackUrl="/admin/dashboard" label="🏠 Dashboard" className="-ml-2 text-xs" />
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-primary" />
            <h1 className="text-xl font-bold">🔔 Notification Centre</h1>
            {unreadCount > 0 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                {unreadCount} unread
              </span>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={markAllRead} disabled={unreadCount === 0}>
            <CheckCheck size={13} className="mr-1" /> Mark all read
          </Button>
        </div>
        <p className="text-xs text-muted-foreground -mt-3">
          Returned applications, issued certificates, notices, system alerts and public drafts — all in one place.
        </p>

        <div className="flex gap-2">
          <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>All</Button>
          <Button size="sm" variant={filter === "unread" ? "default" : "outline"} onClick={() => setFilter("unread")}>Unread</Button>
        </div>

        <section className="rounded-2xl border border-border/40 bg-white/80 backdrop-blur-sm p-2">
          {rows === null ? (
            <p className="text-xs text-muted-foreground p-4">Loading…</p>
          ) : visible.length === 0 ? (
            <p className="text-xs text-muted-foreground p-4">Nothing here yet. 🎉</p>
          ) : (
            <ul className="divide-y divide-border/30">
              {visible.map((n) => {
                const meta = KIND_META[n.kind] ?? KIND_META.general;
                return (
                  <li key={n.id} className={`px-3 py-3 flex items-start gap-3 ${n.read_at ? "" : "bg-primary/[0.03]"}`}>
                    <span className="text-base leading-5">{meta.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{n.title}</p>
                      {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {meta.label} · {new Date(n.created_at).toLocaleString()}
                      </p>
                      {n.action_href && (
                        <Link to={n.action_href} className="text-[11px] underline text-primary">
                          {n.action_label ?? "Open"}
                        </Link>
                      )}
                    </div>
                    {!n.read_at && (
                      <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>Mark read</Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
