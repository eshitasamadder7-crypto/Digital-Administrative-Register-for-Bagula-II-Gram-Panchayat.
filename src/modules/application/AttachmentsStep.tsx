import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Attachments } from "./types";

export default function AttachmentsStep({
  value, onChange,
}: { value: Attachments; onChange: (v: Attachments) => void }) {
  const set = (patch: Partial<Attachments>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold">📎 Declaration &amp; Attachments</h2>
        <p className="text-sm text-muted-foreground">
          Tick the documents collected at the counter. Physical copies stay with the office file.
        </p>
      </div>

      <ul className="space-y-2">
        {value.items.map((item, i) => (
          <li key={item.label}>
            <label className="flex items-center gap-2 rounded-md border p-3 text-sm">
              <Checkbox
                checked={item.provided}
                onCheckedChange={(c) =>
                  set({ items: value.items.map((it, idx) => (idx === i ? { ...it, provided: c === true } : it)) })
                }
              />
              {item.label}
            </label>
          </li>
        ))}
      </ul>

      <div className="space-y-1.5">
        <Label htmlFor="att-notes">Office notes (optional)</Label>
        <Textarea id="att-notes" rows={3} value={value.notes}
          onChange={(e) => set({ notes: e.target.value })} />
      </div>

      <label className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
        <Checkbox checked={value.declarationAccepted}
          onCheckedChange={(c) => set({ declarationAccepted: c === true })} />
        <span>
          I declare that the information recorded above was provided by the applicant and verified
          against the documents produced at the office counter.
        </span>
      </label>
    </div>
  );
}
