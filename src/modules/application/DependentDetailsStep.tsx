import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { ApplicantInfo, DependentDetails, DependentPerson } from "./types";

const DEPT_OPTIONS = ["Indian Railways", "State Government", "Central Government", "Other"];
const DEP_RELATIONS = ["Wife", "Husband", "Son", "Daughter", "Mother", "Father", "Other"];
const TITLES = ["Shri", "Smt.", "Md.", "Mst."];

export default function DependentDetailsStep({
  value, applicant, onChange,
}: {
  value: DependentDetails;
  applicant: ApplicantInfo;
  onChange: (v: DependentDetails) => void;
}) {
  const set = (patch: Partial<DependentDetails>) => onChange({ ...value, ...patch });
  const setDep = (i: number, patch: Partial<DependentPerson>) =>
    set({ dependents: value.dependents.map((d, idx) => (idx === i ? { ...d, ...patch } : d)) });

  const toggleEmployee = (checked: boolean) => {
    set({
      applicantIsEmployee: checked,
      empName: checked ? applicant.name : "",
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold">📄 Dependent Certificate Details</h2>
        <p className="text-sm text-muted-foreground">Employee details and the dependents to be certified.</p>
      </div>

      <label className="flex items-center gap-2 rounded-md border bg-muted/40 p-3 text-sm">
        <Checkbox checked={value.applicantIsEmployee}
          onCheckedChange={(c) => toggleEmployee(c === true)} />
        ☑ Applicant is the Employee
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="d-empname">Employee Name</Label>
          <Input id="d-empname"
            value={value.applicantIsEmployee ? applicant.name : value.empName}
            disabled={value.applicantIsEmployee}
            onChange={(e) => set({ empName: e.target.value })} />
          {value.applicantIsEmployee && (
            <p className="text-xs text-muted-foreground">Auto-filled from the applicant details.</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="d-empid">Employee ID / PF No.</Label>
          <Input id="d-empid" value={value.empId} onChange={(e) => set({ empId: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="d-dept">Department</Label>
          <Select value={value.dept} onValueChange={(v) => set({ dept: v })}>
            <SelectTrigger id="d-dept"><SelectValue /></SelectTrigger>
            <SelectContent>{DEPT_OPTIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
          </Select>
          {value.dept === "Other" && (
            <Input className="mt-2" placeholder="Type department" value={value.deptManual}
              onChange={(e) => set({ deptManual: e.target.value })} />
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Dependents</h3>
          <Button type="button" size="sm" variant="outline"
            onClick={() => set({ dependents: [...value.dependents, { relation: "Son", title: "Shri", name: "", parentRelType: "S/O", parentName: "" }] })}>
            <Plus className="mr-1 h-4 w-4" /> Add dependent
          </Button>
        </div>

        {value.dependents.map((d, i) => (
          <div key={i} className="rounded-md border p-3">
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor={`dep-rel-${i}`}>Relation</Label>
                <Select value={d.relation} onValueChange={(v) => setDep(i, { relation: v })}>
                  <SelectTrigger id={`dep-rel-${i}`}><SelectValue /></SelectTrigger>
                  <SelectContent>{DEP_RELATIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`dep-title-${i}`}>Title</Label>
                <Select value={d.title} onValueChange={(v) => setDep(i, { title: v })}>
                  <SelectTrigger id={`dep-title-${i}`}><SelectValue /></SelectTrigger>
                  <SelectContent>{TITLES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor={`dep-name-${i}`}>Name</Label>
                <Input id={`dep-name-${i}`} value={d.name} onChange={(e) => setDep(i, { name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`dep-prel-${i}`}>Relation Type</Label>
                <Select value={d.parentRelType} onValueChange={(v) => setDep(i, { parentRelType: v })}>
                  <SelectTrigger id={`dep-prel-${i}`}><SelectValue /></SelectTrigger>
                  <SelectContent>{["S/O", "D/O", "W/O", "C/O"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor={`dep-pname-${i}`}>Father / Husband Name</Label>
                <Input id={`dep-pname-${i}`} value={d.parentName} onChange={(e) => setDep(i, { parentName: e.target.value })} />
              </div>
              <div className="flex items-end">
                {value.dependents.length > 1 && (
                  <Button type="button" size="sm" variant="ghost"
                    onClick={() => set({ dependents: value.dependents.filter((_, idx) => idx !== i) })}>
                    <Trash2 className="mr-1 h-4 w-4" /> Remove
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
