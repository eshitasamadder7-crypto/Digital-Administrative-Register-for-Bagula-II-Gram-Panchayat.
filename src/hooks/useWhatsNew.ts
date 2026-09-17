import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type WhatsNewEntry = {
  id: string;
  posted_on: string;
  content: string;
  sort_order: number;
  is_published: boolean;
  is_pinned?: boolean;
  expiry_mode?: string;
  expires_at?: string | null;
  archived_at?: string | null;
};

export type WhatsNewGroup = { date: string; items: string[]; pinned?: boolean };

function isVisible(row: {
  is_published: boolean;
  archived_at: string | null;
  expiry_mode: string;
  expires_at: string | null;
}): boolean {
  if (!row.is_published) return false;
  if (row.archived_at) return false;
  if ((row.expiry_mode === "date" || row.expiry_mode === "datetime") && row.expires_at) {
    if (new Date(row.expires_at).getTime() <= Date.now()) return false;
  }
  return true;
}

export function useWhatsNew() {
  const [groups, setGroups] = useState<WhatsNewGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("whats_new_entries")
        .select("posted_on, content, sort_order, is_published, is_pinned, expiry_mode, expires_at, archived_at")
        .eq("is_published", true)
        .is("archived_at", null)
        .order("is_pinned", { ascending: false })
        .order("posted_on", { ascending: false })
        .order("sort_order", { ascending: true });
      if (cancelled) return;
      const visible = (data ?? []).filter((r) => isVisible(r as any));
      const pinnedItems = visible.filter((r) => (r as any).is_pinned);
      const rest = visible.filter((r) => !(r as any).is_pinned);

      const groupsOut: WhatsNewGroup[] = [];
      if (pinnedItems.length) {
        groupsOut.push({
          date: "Pinned",
          items: pinnedItems.map((r) => r.content),
          pinned: true,
        });
      }
      const map = new Map<string, string[]>();
      rest.forEach((row) => {
        const arr = map.get(row.posted_on) ?? [];
        arr.push(row.content);
        map.set(row.posted_on, arr);
      });
      for (const [date, items] of map.entries()) {
        groupsOut.push({ date, items });
      }
      setGroups(groupsOut);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("whats_new_entries_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "whats_new_entries" }, load)
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return { groups, loading };
}
