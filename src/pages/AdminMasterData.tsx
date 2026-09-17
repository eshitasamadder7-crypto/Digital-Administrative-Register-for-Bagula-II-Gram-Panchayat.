import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Edit3,
  Database,
  Sliders,
  ShieldCheck,
  Building2,
  Video,
  Search,
  Download,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  FileSpreadsheet,
  X,
  Users,
} from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { logActivity } from "@/lib/activityLog";
import {
  MASTER_CATEGORIES,
  type MasterCategory,
  type MasterDataItem,
  seedDefaultMasterData,
  broadcastMasterDataUpdate,
  getMasterDataOverrides,
  saveMasterDataOverride,
  removeMasterDataOverride,
} from "@/lib/masterData";
import { MasterDataService } from "@/lib/api/MasterDataService";
import { useAppSettings, formatMemoPrefix } from "@/lib/appSettings";
import { useAuthz } from "@/lib/permissions";
import {
  handleAdminDbError,
  SchemaErrorAlert,
  type SchemaErrorInfo,
} from "@/lib/adminDatabaseErrorHandler";
import { AdminEditMasterItemModal } from "@/components/admin/AdminEditMasterItemModal";
import { AdminRulesManager } from "@/components/admin/AdminRulesManager";
import { AdminValidationManager } from "@/components/admin/AdminValidationManager";
import { AdminAuthorityManager } from "@/components/admin/AdminAuthorityManager";
import { AdminSopGuidesManager } from "@/components/admin/AdminSopGuidesManager";
import { AdminMembersManager } from "@/components/admin/AdminMembersManager";

type MainTab = "registries" | "rules" | "validation" | "authority" | "sop_guides" | "members";

export default function AdminMasterData() {
  const authz = useAuthz();
  const { workflow, validation, authority, reload: reloadSettings } = useAppSettings();

  const [activeTab, setActiveTab] = useState<MainTab>("registries");
  const [category, setCategory] = useState<MasterCategory>("village");
  const [items, setItems] = useState<MasterDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlyActive, setShowOnlyActive] = useState(false);
  const [schemaError, setSchemaError] = useState<SchemaErrorInfo | null>(null);

  // Form for adding new entry
  const [form, setForm] = useState({ label: "", label_bn: "", parent_code: "" });

  // Modal editing item
  const [editingItem, setEditingItem] = useState<MasterDataItem | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Delete confirmation dialog target
  const [deleteTarget, setDeleteTarget] = useState<MasterDataItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Seeding progress
  const [seeding, setSeeding] = useState(false);

  const loadCategory = async (cat: MasterCategory) => {
    if (cat === "sop_guides") return;
    setLoading(true);
    const { data, error } = await supabase
      .from("master_data" as never)
      .select("*")
      .eq("category", cat)
      .order("sort_order", { ascending: true });

    if (error) {
      handleAdminDbError(error, "load", "master_data", () => loadCategory(cat), setSchemaError);
    } else {
      setSchemaError(null);
      const rawList = ((data ?? []) as unknown as MasterDataItem[]) || [];
      const overrides = getMasterDataOverrides();
      const merged = rawList.map((it) => {
        if (typeof overrides[it.id] === "boolean") {
          return { ...it, is_active: overrides[it.id] };
        }
        return it;
      });
      setItems(merged);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === "registries" && category !== "sop_guides") {
      loadCategory(category);
    }
  }, [category, activeTab]);

  const handleAdd = async () => {
    const label = form.label.trim();
    if (!label) {
      toast.error("Please enter an English label");
      return;
    }
    setBusy(true);
    try {
      const code = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
      const sortOrder = (items[items.length - 1]?.sort_order ?? 0) + 1;

      let saved = false;
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc("save_master_data_item" as never, {
          _category: category,
          _code: code,
          _label: label,
          _label_bn: form.label_bn.trim() || null,
          _parent_code: form.parent_code.trim() || null,
          _sort_order: sortOrder,
          _is_active: true,
        } as never);
        if (!rpcErr && rpcRes) {
          saved = true;
        }
      } catch (_) {
        // fallback to direct write
      }

      if (!saved) {
        const { error } = await supabase.from("master_data" as never).insert({
          category,
          code,
          label,
          label_bn: form.label_bn.trim() || null,
          parent_code: form.parent_code.trim() || null,
          sort_order: sortOrder,
          is_active: true,
        } as never);
        if (error) {
          // Fallback to office-accounts edge function
          await supabase.functions.invoke("office-accounts", {
            body: {
              action: "save_master_data",
              payload: {
                category,
                code,
                label,
                label_bn: form.label_bn.trim() || null,
                parent_code: form.parent_code.trim() || null,
                sort_order: sortOrder,
                is_active: true,
              },
            },
          });
        }
      }

      await logActivity({
        action_type: "master_data.create",
        target_table: "master_data",
        target_id: `${category}:${code}`,
        metadata: { label, label_bn: form.label_bn, parent_code: form.parent_code },
      });

      setForm({ label: "", label_bn: "", parent_code: "" });
      toast.success(`Added "${label}" to ${category} registry`);
      MasterDataService.clearCache();
      broadcastMasterDataUpdate(category);
      loadCategory(category);
    } catch (e: any) {
      handleAdminDbError(e, "insert", "master_data", () => handleAdd(), setSchemaError);
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (item: MasterDataItem) => {
    const nextState = !item.is_active;

    // 1. Persist to local storage override immediately so all pages/forms update instantly
    saveMasterDataOverride(item.id, nextState);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_active: nextState } : i)));
    MasterDataService.clearCache();
    broadcastMasterDataUpdate(item.category);

    let saved = false;

    // 2. Try SECURITY DEFINER toggle_master_data RPC
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc("toggle_master_data" as never, {
        _id: item.id,
        _is_active: nextState,
      } as never);
      if (!rpcErr && rpcRes) {
        saved = true;
      }
    } catch {
      // fallback
    }

    // 3. Try direct update with .select()
    if (!saved) {
      try {
        const { data: updateRes, error: updateErr } = await supabase
          .from("master_data" as never)
          .update({ is_active: nextState } as never)
          .eq("id", item.id)
          .select();

        if (!updateErr && updateRes && (updateRes as any[]).length > 0) {
          saved = true;
        }
      } catch {
        // fallback
      }
    }

    // 4. Fallback to office-accounts edge function
    if (!saved) {
      try {
        const { data: edgeRes, error: edgeErr } = await supabase.functions.invoke("office-accounts", {
          body: {
            action: "update_master_data",
            payload: { id: item.id, is_active: nextState },
          },
        });
        if (!edgeErr && edgeRes && !edgeRes.error) {
          saved = true;
        }
      } catch {
        // non-fatal
      }
    }

    toast.success(`Entry marked as ${nextState ? "Active" : "Inactive"}`);
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    const item = deleteTarget;
    setDeleting(true);
    try {
      removeMasterDataOverride(item.id);
      let deleted = false;
      const { data: delData, error } = await supabase
        .from("master_data" as never)
        .delete()
        .eq("id", item.id)
        .select();

      if (!error && delData && (delData as any[]).length > 0) {
        deleted = true;
      }

      if (!deleted) {
        // Fallback to edge function
        await supabase.functions.invoke("office-accounts", {
          body: {
            action: "delete_master_data",
            payload: { id: item.id },
          },
        });
      }

      await logActivity({
        action_type: "master_data.delete",
        target_table: "master_data",
        target_id: `${item.category}:${item.code}`,
        metadata: { label: item.label },
      });

      setItems((prev) => prev.filter((i) => i.id !== item.id));
      MasterDataService.clearCache();
      broadcastMasterDataUpdate(item.category);
      toast.success(`Deleted "${item.label}" from registry`);
      setDeleteTarget(null);
    } catch (e: any) {
      handleAdminDbError(e, "delete", "master_data", () => executeDelete(), setSchemaError);
    } finally {
      setDeleting(false);
    }
  };

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      const result = await seedDefaultMasterData(category === "sop_guides" ? undefined : category);
      MasterDataService.clearCache();
      broadcastMasterDataUpdate(category === "sop_guides" ? undefined : category);
      toast.success(
        `Default seeding complete! Added: ${result.added} new records, Skipped: ${result.skipped} existing records.`
      );
      if (category !== "sop_guides") {
        loadCategory(category);
      }
    } catch (e: any) {
      toast.error(e.message || "Could not seed defaults");
    } finally {
      setSeeding(false);
    }
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(items, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `bagula2_master_${category}_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success(`Exported ${items.length} records to JSON`);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (!Array.isArray(parsed)) throw new Error("JSON must be an array of records");

        let imported = 0;
        for (const row of parsed) {
          if (row.code && row.label) {
            const { error } = await supabase.from("master_data" as never).upsert({
              category: row.category || category,
              code: row.code,
              label: row.label,
              label_bn: row.label_bn || null,
              parent_code: row.parent_code || null,
              sort_order: Number(row.sort_order) || 0,
              is_active: row.is_active ?? true,
            } as never, { onConflict: "category,code" } as never);
            if (!error) imported++;
          }
        }
        toast.success(`Successfully imported ${imported} records!`);
        MasterDataService.clearCache();
        broadcastMasterDataUpdate(category);
        loadCategory(category);
      } catch (err: any) {
        toast.error(`Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Filter items by search query and active toggle
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (showOnlyActive && !item.is_active) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.label.toLowerCase().includes(q) ||
        (item.label_bn && item.label_bn.toLowerCase().includes(q)) ||
        item.code.toLowerCase().includes(q) ||
        (item.parent_code && item.parent_code.toLowerCase().includes(q))
      );
    });
  }, [items, searchQuery, showOnlyActive]);

  const activeCategoryMeta = MASTER_CATEGORIES.find((c) => c.key === category)!;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Breadcrumb & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BackButton fallbackUrl="/admin/dashboard" label="🏠 Dashboard" className="-ml-2 text-xs" />
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[11px] font-mono bg-white/80 border-primary/30 text-primary">
              🔒 Super Admin Console
            </Badge>
            {authority.emergencyNoticeEnabled && (
              <Badge className="bg-amber-600 text-white text-[11px] flex items-center gap-1">
                <AlertTriangle size={12} /> Emergency Banner Active
              </Badge>
            )}
          </div>
        </div>

        {/* Schema Error Diagnostic & Retry Alert */}
        {schemaError && (
          <SchemaErrorAlert
            error={schemaError}
            onDismiss={() => setSchemaError(null)}
            onRetry={() => loadCategory(category)}
          />
        )}

        {/* Title Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/40 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary text-white shadow-sm">
                <Database size={22} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  Master Data & Rules Center
                </h1>
                <p className="text-xs text-muted-foreground">
                  Configure authoritative registries, validation logic, certificate memo schemes, and office settings for {authority.gramPanchayatName}.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-white border border-border/40 shadow-2xs">
              <span className="text-muted-foreground">Active Warish Memo:</span>{" "}
              <strong className="font-mono text-primary">{formatMemoPrefix(workflow.warishMemoPrefix)}</strong>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-white border border-border/40 shadow-2xs">
              <span className="text-muted-foreground">Max Upload:</span>{" "}
              <strong className="font-mono text-emerald-700">{(validation.maxGeneralDocSizeKb / 1024).toFixed(1)} MB</strong>
            </div>
          </div>
        </div>

        {/* Primary Tab Navigation */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-muted/40 border border-border/40 shadow-2xs">
          <Button
            size="sm"
            variant={activeTab === "registries" ? "default" : "ghost"}
            onClick={() => setActiveTab("registries")}
            className="rounded-xl text-xs gap-1.5 font-medium"
          >
            <Database size={14} /> 🗂️ Master Registries
          </Button>

          <Button
            size="sm"
            variant={activeTab === "rules" ? "default" : "ghost"}
            onClick={() => setActiveTab("rules")}
            className="rounded-xl text-xs gap-1.5 font-medium"
          >
            <Sliders size={14} /> ⚙️ Application Rules & Workflow
          </Button>

          <Button
            size="sm"
            variant={activeTab === "validation" ? "default" : "ghost"}
            onClick={() => setActiveTab("validation")}
            className="rounded-xl text-xs gap-1.5 font-medium"
          >
            <ShieldCheck size={14} /> 🛡️ Validation Logic & Upload Limits
          </Button>

          <Button
            size="sm"
            variant={activeTab === "authority" ? "default" : "ghost"}
            onClick={() => setActiveTab("authority")}
            className="rounded-xl text-xs gap-1.5 font-medium"
          >
            <Building2 size={14} /> 🏛️ Administrative Authority & Office
          </Button>

          <Button
            size="sm"
            variant={activeTab === "sop_guides" ? "default" : "ghost"}
            onClick={() => setActiveTab("sop_guides")}
            className="rounded-xl text-xs gap-1.5 font-medium"
          >
            <Video size={14} /> 🎬 SOPs, Workflows & Videos
          </Button>

          <Button
            size="sm"
            variant={activeTab === "members" ? "default" : "ghost"}
            onClick={() => setActiveTab("members")}
            className="rounded-xl text-xs gap-1.5 font-medium"
          >
            <Users size={14} /> 👥 Elected Members & Parties
          </Button>
        </div>

        {/* =================================================================== */}
        {/* TAB 1: MASTER REGISTRIES                                             */}
        {/* =================================================================== */}
        {activeTab === "registries" && (
          <div className="space-y-5">
            {/* Category Pills & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {MASTER_CATEGORIES.filter((c) => c.key !== "sop_guides").map((c) => (
                  <Button
                    key={c.key}
                    size="sm"
                    variant={c.key === category ? "default" : "outline"}
                    onClick={() => {
                      setCategory(c.key);
                      setSearchQuery("");
                    }}
                    className="text-xs rounded-xl"
                  >
                    <span>{c.emoji}</span>
                    <span>{c.label}</span>
                  </Button>
                ))}
              </div>

              {/* Top Quick Actions */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSeedDefaults}
                  disabled={seeding}
                  className="text-xs rounded-xl border-emerald-500/40 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100/60"
                  title="Seed official Bagula-II standard master data entries"
                >
                  <Sparkles size={13} className="mr-1 text-emerald-600" />
                  {seeding ? "Seeding…" : "Seed Standard Defaults"}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportJson}
                  className="text-xs rounded-xl"
                  title="Export current registry to JSON"
                >
                  <Download size={13} className="mr-1" /> Export
                </Button>

                <label className="cursor-pointer">
                  <span className="inline-flex items-center justify-center text-xs h-8 px-3 rounded-xl border border-input bg-background hover:bg-accent hover:text-accent-foreground font-medium">
                    <Upload size={13} className="mr-1" /> Import
                  </span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImportJson}
                  />
                </label>
              </div>
            </div>

            {/* Add New Entry Card */}
            <section className="rounded-2xl border border-border/40 bg-white/90 backdrop-blur-sm p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <span>➕ Add New Entry to</span>
                    <span className="text-primary">{activeCategoryMeta.emoji} {activeCategoryMeta.label}</span>
                  </h2>
                  <p className="text-[11px] text-muted-foreground">{activeCategoryMeta.hint}</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold" htmlFor="md-label">Label (English) *</Label>
                  <Input
                    id="md-label"
                    placeholder="Official English name"
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold" htmlFor="md-label-bn">Label (বাংলা)</Label>
                  <Input
                    id="md-label-bn"
                    placeholder="বাংলা নাম"
                    value={form.label_bn}
                    onChange={(e) => setForm({ ...form, label_bn: e.target.value })}
                    className="text-xs h-9 font-bengali"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold" htmlFor="md-parent">
                    {category === "village"
                      ? "Post Office Parent Code"
                      : category === "post_office"
                      ? "PIN Code (741502)"
                      : "Linked / Parent Code (Optional)"}
                  </Label>
                  <Input
                    id="md-parent"
                    placeholder={category === "village" ? "e.g. bagula or muragacha_colony" : "e.g. 741502 or heir"}
                    value={form.parent_code}
                    onChange={(e) => setForm({ ...form, parent_code: e.target.value })}
                    className="text-xs h-9 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button size="sm" onClick={handleAdd} disabled={busy} className="px-4 text-xs">
                  <Plus size={14} className="mr-1.5" /> {busy ? "Adding…" : `Add to ${activeCategoryMeta.label}`}
                </Button>
              </div>
            </section>

            {/* List & Search Controls */}
            <section className="rounded-2xl border border-border/40 bg-white/90 backdrop-blur-sm p-4 space-y-3 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/30">
                <div className="relative flex-1 max-w-sm">
                  <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder={`Search ${activeCategoryMeta.label.toLowerCase()}…`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-xs h-8 rounded-xl"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="filter-active"
                      checked={showOnlyActive}
                      onCheckedChange={setShowOnlyActive}
                    />
                    <Label htmlFor="filter-active" className="cursor-pointer text-xs font-medium">
                      Active Only
                    </Label>
                  </div>
                  <span className="text-muted-foreground font-mono">
                    Showing <strong>{filteredItems.length}</strong> of {items.length} records
                  </span>
                </div>
              </div>

              {loading ? (
                <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  <p>Loading {activeCategoryMeta.label.toLowerCase()} registry…</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground space-y-3">
                  <p>No records found matching your filters.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSeedDefaults}
                    disabled={seeding}
                    className="text-xs"
                  >
                    <Sparkles size={13} className="mr-1 text-emerald-600" />
                    Seed Standard Defaults for {activeCategoryMeta.label}
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border/40 text-muted-foreground bg-muted/20">
                        <th className="py-2.5 px-3 font-semibold w-12">#</th>
                        <th className="py-2.5 px-3 font-semibold">Official Label</th>
                        <th className="py-2.5 px-3 font-semibold">বাংলা নাম (Bengali)</th>
                        <th className="py-2.5 px-3 font-semibold">System Code</th>
                        <th className="py-2.5 px-3 font-semibold">Parent / Linked</th>
                        <th className="py-2.5 px-3 font-semibold text-center w-24">Status</th>
                        <th className="py-2.5 px-3 font-semibold text-right w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {filteredItems.map((i, idx) => (
                        <tr key={i.id} className="hover:bg-muted/10 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-muted-foreground">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-medium text-foreground">
                            {i.label}
                          </td>
                          <td className="py-2.5 px-3 font-bengali text-muted-foreground">
                            {i.label_bn || "—"}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-primary/80">
                            <code>{i.code}</code>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
                            {i.parent_code ? <Badge variant="secondary" className="font-mono text-[10px]">{i.parent_code}</Badge> : "—"}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => toggleActive(i)}
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors ${
                                i.is_active
                                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}
                            >
                              {i.is_active ? "Active" : "Inactive"}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-primary"
                                onClick={() => {
                                  setEditingItem(i);
                                  setEditModalOpen(true);
                                }}
                                title={`Edit ${i.label}`}
                              >
                                <Edit3 size={13} />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => setDeleteTarget(i)}
                                title={`Delete ${i.label}`}
                              >
                                <Trash2 size={13} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: APPLICATION RULES & WORKFLOW                                 */}
        {/* =================================================================== */}
        {activeTab === "rules" && (
          <AdminRulesManager initialRules={workflow} onSaved={reloadSettings} />
        )}

        {/* =================================================================== */}
        {/* TAB 3: VALIDATION LOGIC & UPLOAD LIMITS                             */}
        {/* =================================================================== */}
        {activeTab === "validation" && (
          <AdminValidationManager initialRules={validation} onSaved={reloadSettings} />
        )}

        {/* =================================================================== */}
        {/* TAB 4: ADMINISTRATIVE AUTHORITY & JURISDICTION                      */}
        {/* =================================================================== */}
        {activeTab === "authority" && (
          <AdminAuthorityManager initialSettings={authority} onSaved={reloadSettings} />
        )}

        {/* =================================================================== */}
        {/* TAB 5: SOPS, WORKFLOWS & VIDEOS                                     */}
        {/* =================================================================== */}
        {activeTab === "sop_guides" && (
          <AdminSopGuidesManager />
        )}

        {/* =================================================================== */}
        {/* TAB 6: ELECTED MEMBERS & POLITICAL PARTIES                          */}
        {/* =================================================================== */}
        {activeTab === "members" && (
          <AdminMembersManager />
        )}

        {/* In-line Edit Master Item Modal */}
        <AdminEditMasterItemModal
          item={editingItem}
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          onUpdated={() => loadCategory(category)}
        />

        {/* Confirmation Dialog for Deleting Master Entry */}
        <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-destructive">
                <Trash2 size={18} /> Confirm Registry Deletion
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground pt-1">
                Are you sure you want to permanently delete <strong className="text-foreground font-semibold">"{deleteTarget?.label}"</strong> (Code: <code className="font-mono text-primary">{deleteTarget?.code}</code>) from the authoritative <span className="capitalize font-semibold">{deleteTarget?.category}</span> registry?
              </DialogDescription>
            </DialogHeader>
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
              ⚠️ Warning: If existing applications or certificate templates reference this code, deleting it may affect future record lookups.
            </p>
            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="rounded-xl text-xs font-semibold gap-1.5"
                onClick={executeDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Yes, Delete Entry"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
