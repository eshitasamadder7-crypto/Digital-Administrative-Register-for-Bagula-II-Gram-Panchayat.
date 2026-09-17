import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/activityLog";
import type { MasterDataItem } from "@/lib/masterData";
import { broadcastMasterDataUpdate, saveMasterDataOverride } from "@/lib/masterData";
import { MasterDataService } from "@/lib/api/MasterDataService";
import { Save } from "lucide-react";

interface Props {
  item: MasterDataItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export function AdminEditMasterItemModal({ item, open, onOpenChange, onUpdated }: Props) {
  const [label, setLabel] = useState("");
  const [labelBn, setLabelBn] = useState("");
  const [parentCode, setParentCode] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setLabel(item.label || "");
      setLabelBn(item.label_bn || "");
      setParentCode(item.parent_code || "");
      setSortOrder(item.sort_order || 0);
      setIsActive(item.is_active ?? true);
    }
  }, [item]);

  if (!item) return null;

  const handleSave = async () => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      toast.error("Label cannot be empty");
      return;
    }

    setSaving(true);
    try {
      // 1. Immediately persist active override locally so forms and UI reflect without delay
      saveMasterDataOverride(item.id, isActive);

      let saved = false;
      const { data: updateData, error } = await supabase
        .from("master_data" as never)
        .update({
          label: trimmedLabel,
          label_bn: labelBn.trim() || null,
          parent_code: parentCode.trim() || null,
          sort_order: Number(sortOrder) || 0,
          is_active: isActive,
        } as never)
        .eq("id", item.id)
        .select();

      if (!error && updateData && (updateData as any[]).length > 0) {
        saved = true;
      }

      if (!saved) {
        // Fallback to office-accounts edge function
        await supabase.functions.invoke("office-accounts", {
          body: {
            action: "update_master_data",
            payload: {
              id: item.id,
              label: trimmedLabel,
              label_bn: labelBn.trim() || null,
              parent_code: parentCode.trim() || null,
              sort_order: Number(sortOrder) || 0,
              is_active: isActive,
            },
          },
        });
      }

      await logActivity({
        action_type: "master_data.update",
        target_table: "master_data",
        target_id: `${item.category}:${item.code}`,
        metadata: {
          label: trimmedLabel,
          label_bn: labelBn,
          parent_code: parentCode,
          sort_order: sortOrder,
          is_active: isActive,
        },
      });

      toast.success(`Updated "${trimmedLabel}" successfully`);
      MasterDataService.clearCache();
      broadcastMasterDataUpdate(item.category);
      onOpenChange(false);
      onUpdated();
    } catch (e: any) {
      toast.error(e.message || "Could not update entry");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            ✏️ Edit Master Entry: <span className="text-primary font-mono text-sm">{item.code}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Category: <strong className="capitalize">{item.category.replace(/_/g, " ")}</strong>. Updates apply across all citizen & office forms.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-2">
          <div className="space-y-1">
            <Label htmlFor="edit-label" className="text-xs font-medium">Label (English) *</Label>
            <Input
              id="edit-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Official English name"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-label-bn" className="text-xs font-medium">Label (বাংলা)</Label>
            <Input
              id="edit-label-bn"
              value={labelBn}
              onChange={(e) => setLabelBn(e.target.value)}
              placeholder="বাংলা প্রতিশব্দ"
              className="h-9 text-sm font-bengali"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="edit-parent" className="text-xs font-medium">Linked Parent Code</Label>
              <Input
                id="edit-parent"
                value={parentCode}
                onChange={(e) => setParentCode(e.target.value)}
                placeholder="e.g. 741502 or bagula"
                className="h-9 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-sort" className="text-xs font-medium">Sort Order</Label>
              <Input
                id="edit-sort"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            <div>
              <Label htmlFor="edit-active" className="text-xs font-semibold cursor-pointer">Active Status</Label>
              <p className="text-[11px] text-muted-foreground">Inactive items are hidden from citizen dropdowns</p>
            </div>
            <Switch id="edit-active" checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save size={14} className="mr-1.5" /> {saving ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
