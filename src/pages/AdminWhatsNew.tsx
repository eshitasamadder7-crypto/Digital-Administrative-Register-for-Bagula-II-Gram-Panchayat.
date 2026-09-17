import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, LogOut, Plus, Pin, Archive } from "lucide-react";
import { SignOutConfirmDialog } from "@/components/SignOutConfirmDialog";
import { BackButton } from "@/components/BackButton";

type ExpiryMode = "never" | "date" | "datetime" | "manual";

type Entry = {
  id: string;
  posted_on: string;
  content: string;
  sort_order: number;
  is_published: boolean;
  is_pinned: boolean;
  expiry_mode: ExpiryMode;
  expires_at: string | null;
  archived_at: string | null;
};

const today = () => new Date().toISOString().slice(0, 10);

export default function AdminWhatsNew() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [postedOn, setPostedOn] = useState(today());
  const [content, setContent] = useState("");
  const [sortOrder, setSortOrder] = useState(1);
  const [busy, setBusy] = useState(false);
  const [expiryMode, setExpiryMode] = useState<ExpiryMode>("never");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [pin, setPin] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    const { data, error } = await supabase
      .from("whats_new_entries")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("posted_on", { ascending: false })
      .order("sort_order", { ascending: true });
    if (error) {
      toast.error(error.message);
      return;
    }
    setEntries((data as Entry[]) ?? []);
  };

  const publishedCount = entries.filter((e) => e.is_published && !e.archived_at).length;
  const MAX_NOTICES = 5;

  const addEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    if (publishedCount >= MAX_NOTICES) {
      toast.error(`Maximum ${MAX_NOTICES} active notices allowed. Hide or delete one first.`);
      return;
    }
    if ((expiryMode === "date" || expiryMode === "datetime") && !expiresAt) {
      toast.error("Please pick an expiry date/time.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("whats_new_entries").insert({
      posted_on: postedOn,
      content: content.trim(),
      sort_order: sortOrder,
      is_pinned: pin,
      expiry_mode: expiryMode,
      expires_at:
        expiryMode === "date" || expiryMode === "datetime"
          ? new Date(expiresAt).toISOString()
          : null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Notice added");
    setContent("");
    setSortOrder(sortOrder + 1);
    setPin(false);
    setExpiryMode("never");
    setExpiresAt("");
    loadEntries();
  };

  const updateEntry = async (id: string, patch: Partial<Entry>) => {
    if (patch.is_published === true) {
      const others = entries.filter((e) => e.id !== id && e.is_published && !e.archived_at).length;
      if (others >= MAX_NOTICES) {
        toast.error(`Maximum ${MAX_NOTICES} active notices allowed.`);
        return;
      }
    }
    const { error } = await supabase.from("whats_new_entries").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    loadEntries();
  };

  const archiveEntry = async (id: string) => {
    if (!confirm("Archive this notice? It will be hidden from the public site but kept for records.")) return;
    const { error } = await supabase
      .from("whats_new_entries")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Archived");
    loadEntries();
  };

  const restoreEntry = async (id: string) => {
    const { error } = await supabase
      .from("whats_new_entries")
      .update({ archived_at: null })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Restored");
    loadEntries();
  };

  const deleteEntry = async (id: string) => {
    if (!confirm("Permanently delete this entry? Consider archiving instead.")) return;
    const { error } = await supabase.from("whats_new_entries").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    loadEntries();
  };

  const [showSignOutDialog, setShowSignOutDialog] = useState(false);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/admin", { replace: true });
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Notice Maker</h1>
            <p className="text-xs text-muted-foreground">
              Active notices: {publishedCount}/{MAX_NOTICES}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <BackButton fallbackUrl="/admin/dashboard" label="🏠 Dashboard" variant="outline" size="sm" />
            <Button variant="outline" size="sm" onClick={() => setShowSignOutDialog(true)}>
              <LogOut size={14} className="mr-1" /> Sign out
            </Button>
          </div>
        </div>

        <SignOutConfirmDialog
          open={showSignOutDialog}
          onOpenChange={setShowSignOutDialog}
          onConfirm={signOut}
          description="Are you sure you want to sign out of Notice Maker?"
        />

        <form onSubmit={addEntry} className="rounded-2xl border bg-white/80 backdrop-blur-sm p-5 space-y-3 shadow-sm">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Plus size={14} /> New entry
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={postedOn} onChange={(e) => setPostedOn(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="order">Sort order</Label>
              <Input id="order" type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value || "0"))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="content">Content</Label>
            <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} placeholder="🟢 Describe the update..." required />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Expiry</Label>
              <Select value={expiryMode} onValueChange={(v) => setExpiryMode(v as ExpiryMode)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Never expire</SelectItem>
                  <SelectItem value="date">Expire on date</SelectItem>
                  <SelectItem value="datetime">Expire on date &amp; time</SelectItem>
                  <SelectItem value="manual">Manual archive only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(expiryMode === "date" || expiryMode === "datetime") && (
              <div className="space-y-1.5">
                <Label htmlFor="expiresAt">Expires at</Label>
                <Input
                  id="expiresAt"
                  type={expiryMode === "datetime" ? "datetime-local" : "date"}
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
            )}
          </div>
          <label className="flex items-center gap-2 text-xs">
            <Switch checked={pin} onCheckedChange={setPin} />
            <Pin size={12} /> Pin this notice to the top
          </label>
          <Button type="submit" disabled={busy}>{busy ? "Saving..." : "Add entry"}</Button>
        </form>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Existing entries</h2>
            <label className="flex items-center gap-2 text-xs">
              <Switch checked={showArchived} onCheckedChange={setShowArchived} />
              Show archived
            </label>
          </div>
          {entries.length === 0 && <p className="text-sm text-muted-foreground">No entries yet.</p>}
          {entries.filter((e) => showArchived || !e.archived_at).map((entry) => (
            <div key={entry.id} className="rounded-xl border bg-white/80 backdrop-blur-sm p-4 shadow-sm space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <Input
                  type="date"
                  className="w-auto"
                  value={entry.posted_on}
                  onChange={(e) => updateEntry(entry.id, { posted_on: e.target.value })}
                />
                <Input
                  type="number"
                  className="w-20"
                  value={entry.sort_order}
                  onChange={(e) => updateEntry(entry.id, { sort_order: parseInt(e.target.value || "0") })}
                />
                <label className="flex items-center gap-2 text-xs">
                  <Switch
                    checked={entry.is_published}
                    onCheckedChange={(v) => updateEntry(entry.id, { is_published: v })}
                  />
                  {entry.is_published ? "Published" : "Hidden"}
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <Switch
                    checked={entry.is_pinned}
                    onCheckedChange={(v) => updateEntry(entry.id, { is_pinned: v })}
                  />
                  <Pin size={12} /> {entry.is_pinned ? "Pinned" : "Pin"}
                </label>
                {entry.archived_at ? (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-200 text-zinc-700">Archived</span>
                ) : null}
                <div className="ml-auto flex gap-1">
                  {entry.archived_at ? (
                    <Button variant="ghost" size="sm" onClick={() => restoreEntry(entry.id)}>Restore</Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => archiveEntry(entry.id)}>
                      <Archive size={14} />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteEntry(entry.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                <Select
                  value={entry.expiry_mode}
                  onValueChange={(v) =>
                    updateEntry(entry.id, {
                      expiry_mode: v as ExpiryMode,
                      expires_at: v === "never" || v === "manual" ? null : entry.expires_at,
                    })
                  }
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never expire</SelectItem>
                    <SelectItem value="date">Expire on date</SelectItem>
                    <SelectItem value="datetime">Expire on date &amp; time</SelectItem>
                    <SelectItem value="manual">Manual archive only</SelectItem>
                  </SelectContent>
                </Select>
                {(entry.expiry_mode === "date" || entry.expiry_mode === "datetime") && (
                  <Input
                    type={entry.expiry_mode === "datetime" ? "datetime-local" : "date"}
                    className="h-8 text-xs"
                    value={entry.expires_at ? entry.expires_at.slice(0, entry.expiry_mode === "datetime" ? 16 : 10) : ""}
                    onChange={(e) =>
                      updateEntry(entry.id, {
                        expires_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                  />
                )}
              </div>
              <Textarea
                value={entry.content}
                onChange={(e) =>
                  setEntries((prev) => prev.map((x) => (x.id === entry.id ? { ...x, content: e.target.value } : x)))
                }
                onBlur={(e) => updateEntry(entry.id, { content: e.target.value })}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
