import { useEffect, useState } from "react";
import { fetchTimeline, type TimelineEvent } from "./api";
import type { ApplicationKind } from "./types";

const EVENT_META: Record<string, { icon: string; label: string }> = {
  created: { icon: "🟢", label: "Application created" },
  submitted: { icon: "📤", label: "Submitted for review" },
  resubmitted: { icon: "📤", label: "Resubmitted after correction" },
  returned: { icon: "🔄", label: "Returned for modification" },
  auto_rejected: { icon: "⛔", label: "Automatically rejected (5 returns)" },
  approved: { icon: "✅", label: "Approved" },
  rejected: { icon: "⛔", label: "Rejected" },
  archived: { icon: "🗄️", label: "Archived" },
  restored: { icon: "♻️", label: "Restored" },
  downloaded: { icon: "📜", label: "Certificate downloaded" },
  modified: { icon: "📝", label: "Modified" },
  verified: { icon: "🔎", label: "Verified" },
  revoked: { icon: "🚫", label: "Revoked" },
};

export default function ApplicationTimeline({
  kind, id, showActor = true,
}: { kind: ApplicationKind; id: string; showActor?: boolean }) {
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchTimeline(kind, id)
      .then((rows) => active && setEvents(rows))
      .catch((e) => active && setError(e instanceof Error ? e.message : "Could not load timeline"));
    return () => { active = false; };
  }, [kind, id]);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!events) return <p className="text-sm text-muted-foreground">Loading timeline…</p>;
  if (events.length === 0) return <p className="text-sm text-muted-foreground">No activity recorded yet.</p>;

  return (
    <ol className="space-y-3">
      {events.map((e, i) => {
        const meta = EVENT_META[e.event] ?? EVENT_META[e.action] ?? { icon: "•", label: e.event };
        return (
          <li key={i} className="flex gap-3">
            <span aria-hidden className="mt-0.5">{meta.icon}</span>
            <div className="text-sm">
              <div className="font-medium">{meta.label}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(e.created_at).toLocaleString()}
                {showActor && e.actor_email ? ` · ${e.actor_email}` : ""}
              </div>
              {e.reason && <div className="mt-1 text-xs text-orange-700">📝 {e.reason}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
