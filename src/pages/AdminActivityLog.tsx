import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Activity, ShieldCheck } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { useAuthz } from "@/lib/permissions";

interface LogRow {
  id: string;
  action_type: string;
  actor_email: string | null;
  target_table: string | null;
  target_id: string | null;
  created_at: string;
}

const ICONS: { match: RegExp; emoji: string }[] = [
  { match: /approve/i, emoji: "✅" },
  { match: /reject/i, emoji: "⛔" },
  { match: /return/i, emoji: "🔄" },
  { match: /submit/i, emoji: "📤" },
  { match: /password|auth|signin|signout/i, emoji: "🔑" },
  { match: /master_data/i, emoji: "🗂️" },
  { match: /employee|admin/i, emoji: "👥" },
  { match: /notice/i, emoji: "📢" },
];

const emojiFor = (action: string) => ICONS.find((i) => i.match.test(action))?.emoji ?? "•";

export default function AdminActivityLog() {
  const authz = useAuthz();
  const [scope, setScope] = useState<"me" | "all">("me");
  const [rows, setRows] = useState<LogRow[] | null>(null);

  useEffect(() => {
    if (authz.loading || !authz.userId) return;
    let active = true;
    (async () => {
      setRows(null);
      let query = supabase
        .from("activity_logs")
        .select("id, action_type, actor_email, target_table, target_id, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (scope === "me") query = query.eq("actor_user_id", authz.userId!);
      const { data } = await query;
      if (active) setRows((data ?? []) as unknown as LogRow[]);
    })();
    return () => {
      active = false;
    };
  }, [authz.loading, authz.userId, scope]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-5">
        <BackButton fallbackUrl="/admin/dashboard" label="🏠 Dashboard" className="-ml-2 text-xs" />
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-primary" />
          <h1 className="text-xl font-bold">📊 My Activity</h1>
        </div>
        <p className="text-xs text-muted-foreground -mt-3">
          Your personal timeline of office actions. Only you and a Super Admin can see it.
        </p>

        {authz.isSuperAdmin && (
          <div className="flex gap-2">
            <Button size="sm" variant={scope === "me" ? "default" : "outline"} onClick={() => setScope("me")}>
              👤 My activity
            </Button>
            <Button size="sm" variant={scope === "all" ? "default" : "outline"} onClick={() => setScope("all")}>
              <ShieldCheck size={13} className="mr-1" /> All office activity
            </Button>
          </div>
        )}

        <section className="rounded-2xl border border-border/40 bg-white/80 backdrop-blur-sm p-2">
          {rows === null ? (
            <p className="text-xs text-muted-foreground p-4">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-xs text-muted-foreground p-4">No activity recorded yet.</p>
          ) : (
            <ul className="divide-y divide-border/30">
              {rows.map((r) => (
                <li key={r.id} className="px-3 py-2.5 flex items-start gap-3">
                  <span className="text-base leading-5">{emojiFor(r.action_type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{r.action_type}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {scope === "all" ? `${r.actor_email ?? "system"} · ` : ""}
                      {r.target_table ?? "—"}
                      {r.target_id ? ` · ${r.target_id.slice(0, 12)}` : ""}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
