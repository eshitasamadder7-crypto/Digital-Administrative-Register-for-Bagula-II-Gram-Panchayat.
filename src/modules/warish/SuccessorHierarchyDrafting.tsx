import React, { useState, useMemo, useEffect } from "react";
import { Plus, Trash2, GitFork, User, AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type WarishSuccessorRecord,
  MAX_DIRECT_SUCCESSORS,
  buildSuccessorTree,
  computeSuccessorSerialCode,
  recalculateTreeSerialCodes,
  getSuccessorDescendantIds,
  generateSuccessorTreePreview,
  validateFullSuccessorHierarchy,
  prepareDocumentReadyData,
} from "./successorModel";
import { MasterDataService, type MasterRelation } from "@/lib/api/MasterDataService";

interface Props {
  deceasedName: string;
  successors: WarishSuccessorRecord[];
  onChange: (records: WarishSuccessorRecord[]) => void;
  readOnly?: boolean;
  appId?: string | null;
  relations?: MasterRelation[];
}

export default function SuccessorHierarchyDrafting({
  deceasedName,
  successors,
  onChange,
  readOnly = false,
  appId,
  relations: externalRelations,
}: Props) {
  const [showTreePreview, setShowTreePreview] = useState(true);
  const [internalRelations, setInternalRelations] = useState<MasterRelation[]>([]);
  const [loadingRelations, setLoadingRelations] = useState(false);

  // Fetch relations if not provided via props
  useEffect(() => {
    if (externalRelations && externalRelations.length > 0) {
      setInternalRelations(externalRelations);
      return;
    }

    let isMounted = true;
    setLoadingRelations(true);
    MasterDataService.getActiveRelations()
      .then((rels) => {
        if (isMounted) {
          setInternalRelations(rels);
          setLoadingRelations(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load active relations:", err);
        if (isMounted) setLoadingRelations(false);
      });

    return () => {
      isMounted = false;
    };
  }, [externalRelations]);

  const activeRelations = useMemo(() => {
    if (externalRelations && externalRelations.length > 0) {
      return externalRelations;
    }
    return internalRelations;
  }, [externalRelations, internalRelations]);

  // Compute nested hierarchy tree
  const tree = useMemo(() => buildSuccessorTree(successors), [successors]);

  // Count direct successors
  const directSuccessors = useMemo(
    () => successors.filter((r) => !r.parent_successor_id),
    [successors]
  );
  const directCount = directSuccessors.length;
  const isDirectLimitReached = directCount >= MAX_DIRECT_SUCCESSORS;

  // Validation
  const validation = useMemo(
    () => validateFullSuccessorHierarchy(successors, deceasedName),
    [successors, deceasedName]
  );

  // Helper to commit changes and renumber deterministically
  const commitRecords = (newRecords: WarishSuccessorRecord[]) => {
    const recalculated = recalculateTreeSerialCodes(newRecords);
    onChange(recalculated);
  };

  // 1. Add Direct Successor (Belongs directly to original deceased)
  const addDirectSuccessor = () => {
    if (isDirectLimitReached) return;
    const sortOrder = directCount + 1;
    const serialCode = computeSuccessorSerialCode(null, 0, sortOrder);
    const defaultRel = activeRelations.find((r) => r.relation_name.toLowerCase() === "son") || activeRelations[0];

    const newRecord: WarishSuccessorRecord = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      application_id: appId || "",
      parent_successor_id: null,
      serial_code: serialCode,
      name: "",
      care_of: "",
      relation: defaultRel?.relation_name || "Son",
      relation_id: defaultRel?.id || null,
      age: null,
      is_deceased: false,
      has_successors: false,
      depth: 0,
      sort_order: sortOrder,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    commitRecords([...successors, newRecord]);
  };

  // 2. Add Child Successor to a Deceased Parent
  const addChildSuccessor = (parent: WarishSuccessorRecord) => {
    if (!parent.is_deceased || !parent.has_successors) return;
    const existingChildren = successors.filter((r) => r.parent_successor_id === parent.id);
    const childSortOrder = existingChildren.length + 1;
    const childDepth = parent.depth + 1;
    const serialCode = computeSuccessorSerialCode(parent.serial_code, childDepth, childSortOrder);

    let defaultRelName = "Grandson";
    if (childDepth === 2) defaultRelName = "Great-Grandson";
    else if (childDepth >= 3) defaultRelName = "Great-Great-Grandson";

    const matchedChildRel =
      activeRelations.find((r) => r.relation_name.toLowerCase() === defaultRelName.toLowerCase()) ||
      activeRelations[0];

    const newChild: WarishSuccessorRecord = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      application_id: appId || "",
      parent_successor_id: parent.id,
      serial_code: serialCode,
      name: "",
      care_of: `C/O Late ${parent.name || "Parent"}`,
      relation: matchedChildRel?.relation_name || defaultRelName,
      relation_id: matchedChildRel?.id || null,
      age: null,
      is_deceased: false,
      has_successors: false,
      depth: childDepth,
      sort_order: childSortOrder,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    commitRecords([...successors, newChild]);
  };

  // 3. Update Successor field
  const updateSuccessor = (id: string, patch: Partial<WarishSuccessorRecord>) => {
    const updated = successors.map((r) => {
      if (r.id !== id) return r;
      const next = { ...r, ...patch, updated_at: new Date().toISOString() };

      // If changed to living, clear has_successors
      if (patch.is_deceased === false) {
        next.has_successors = false;
      }
      return next;
    });

    // If an item changed deceased to false or has_successors to false, remove any orphaned children
    if (patch.is_deceased === false || patch.has_successors === false) {
      const childIds = getSuccessorDescendantIds(id, successors).filter((cid) => cid !== id);
      if (childIds.length > 0) {
        const pruned = updated.filter((r) => !childIds.includes(r.id));
        commitRecords(pruned);
        return;
      }
    }

    commitRecords(updated);
  };

  // 4. Safe Cascade Delete
  const handleDeleteSuccessor = (id: string) => {
    const idsToDelete = getSuccessorDescendantIds(id, successors);
    const remaining = successors.filter((r) => !idsToDelete.includes(r.id));
    commitRecords(remaining);
  };

  // Standard Test Case loader (Section 44)
  const loadStandardTestCase = () => {
    const id1 = `test-1-${Date.now()}`;
    const id2 = `test-2-${Date.now()}`;
    const id3 = `test-3-${Date.now()}`;
    const id4 = `test-4-${Date.now()}`;
    const id5 = `test-5-${Date.now()}`;

    const testRecords: WarishSuccessorRecord[] = [
      {
        id: id1,
        application_id: appId || "",
        parent_successor_id: null,
        serial_code: "1",
        name: "Late Baloram Chakraborty",
        care_of: "S/O Late Napal Chakraborty",
        relation: "Son",
        age: 78,
        is_deceased: true,
        has_successors: true,
        depth: 0,
        sort_order: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: id2,
        application_id: appId || "",
        parent_successor_id: id1,
        serial_code: "1/A",
        name: "Late Krishno Gopal Chakraborty",
        care_of: "S/O Late Baloram Chakraborty",
        relation: "Grandson",
        age: 52,
        is_deceased: true,
        has_successors: true,
        depth: 1,
        sort_order: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: id3,
        application_id: appId || "",
        parent_successor_id: id2,
        serial_code: "1/A/I",
        name: "Late Nandadulal Chakraborty",
        care_of: "S/O Late Krishno Gopal Chakraborty",
        relation: "Great-Grandson",
        age: 34,
        is_deceased: true,
        has_successors: true,
        depth: 2,
        sort_order: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: id4,
        application_id: appId || "",
        parent_successor_id: id3,
        serial_code: "1/A/I/1",
        name: "Late Himadri Chakraborty",
        care_of: "S/O Late Nandadulal Chakraborty",
        relation: "Great-Great-Grandson",
        age: 12,
        is_deceased: true,
        has_successors: false,
        depth: 3,
        sort_order: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: id5,
        application_id: appId || "",
        parent_successor_id: id3,
        serial_code: "1/A/I/2",
        name: "Late Proshanta Chakraborty",
        care_of: "S/O Late Nandadulal Chakraborty",
        relation: "Great-Great-Grandson",
        age: 9,
        is_deceased: true,
        has_successors: false,
        depth: 3,
        sort_order: 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    commitRecords(testRecords);
  };

  // Recursive Renderer for a Successor Node (Section 21)
  const renderSuccessorNode = (
    node: WarishSuccessorRecord,
    parentName: string,
    depth: number
  ) => {
    const isRoot = depth === 0;
    const children = node.children || [];
    const childrenCount = children.length;

    return (
      <div
        key={node.id}
        className={`rounded-lg border bg-card p-4 space-y-4 shadow-sm transition-all ${
          !isRoot ? "ml-4 sm:ml-8 border-l-4 border-l-primary/60" : "border-muted"
        }`}
      >
        {/* Node Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-sm px-2.5 py-0.5 bg-primary/10 border-primary text-primary font-bold">
              {node.serial_code}
            </Badge>
            <span className="font-semibold text-sm">
              {isRoot ? (
                <>Direct Successor {node.serial_code}</>
              ) : (
                <>
                  Successor of Late {parentName} ({node.serial_code})
                </>
              )}
            </span>
            {node.is_deceased ? (
              <Badge variant="secondary" className="text-xs bg-amber-500/15 text-amber-700 border-amber-300">
                ⚰️ Deceased
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-700 border-emerald-300">
                🟢 Living
              </Badge>
            )}
          </div>

          {!readOnly && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10 text-xs h-8"
              onClick={() => {
                if (childrenCount > 0) {
                  const confirmed = window.confirm(
                    `This successor has ${childrenCount} child successor(s). Removing this record will safely cascade and remove all descendants under this branch. Proceed?`
                  );
                  if (!confirmed) return;
                }
                handleDeleteSuccessor(node.id);
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Remove {node.serial_code}
            </Button>
          )}
        </div>

        {/* Form Inputs Grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs font-medium">
              Successor Name / উত্তরসূরির নাম <span className="text-destructive">*</span>
            </Label>
            <Input
              value={node.name}
              disabled={readOnly}
              placeholder={node.is_deceased ? "Late Firstname Lastname" : "Firstname Lastname"}
              onChange={(e) => updateSuccessor(node.id, { name: e.target.value })}
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs font-medium">
              Care of / Father / Husband (পিতা বা স্বামীর নাম)
            </Label>
            <Input
              value={node.care_of}
              disabled={readOnly}
              placeholder="e.g. S/O Late..."
              onChange={(e) => updateSuccessor(node.id, { care_of: e.target.value })}
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium flex items-center justify-between">
              <span>
                Relation with Deceased <span className="text-destructive">*</span>
              </span>
              {loadingRelations && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            </Label>
            <Select
              disabled={readOnly}
              value={node.relation}
              onValueChange={(val) => {
                const matchedRel = activeRelations.find((r) => r.relation_name === val);
                updateSuccessor(node.id, {
                  relation: val,
                  relation_id: matchedRel ? matchedRel.id : null,
                });
              }}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select Relation" />
              </SelectTrigger>
              <SelectContent>
                {activeRelations.map((r) => (
                  <SelectItem key={r.id || r.relation_name} value={r.relation_name}>
                    {r.relation_name} {r.relation_name_bn ? `(${r.relation_name_bn})` : ""}
                  </SelectItem>
                ))}
                {/* Fallback in case current relation is not yet in list */}
                {node.relation &&
                  !activeRelations.some((r) => r.relation_name === node.relation) && (
                    <SelectItem value={node.relation}>{node.relation}</SelectItem>
                  )}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">Relation to original deceased person</p>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium">
              {node.is_deceased ? "Age at Death / মৃত্যুর বয়স" : "Current Age / বর্তমান বয়স"}
            </Label>
            <Input
              type="number"
              min="0"
              max="125"
              value={node.age ?? ""}
              disabled={readOnly}
              placeholder="e.g. 45"
              onChange={(e) =>
                updateSuccessor(node.id, {
                  age: e.target.value ? parseInt(e.target.value, 10) : null,
                })
              }
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs font-medium">Status / বর্তমান অবস্থা</Label>
            <div className="flex gap-2 pt-0.5">
              <Button
                type="button"
                size="sm"
                variant={!node.is_deceased ? "default" : "outline"}
                disabled={readOnly}
                onClick={() => updateSuccessor(node.id, { is_deceased: false })}
                className={`flex-1 h-9 text-xs font-medium ${
                  !node.is_deceased ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                }`}
              >
                🟢 Living (জীবিত)
              </Button>
              <Button
                type="button"
                size="sm"
                variant={node.is_deceased ? "default" : "outline"}
                disabled={readOnly}
                onClick={() => updateSuccessor(node.id, { is_deceased: true })}
                className={`flex-1 h-9 text-xs font-medium ${
                  node.is_deceased ? "bg-amber-700 hover:bg-amber-800 text-white" : ""
                }`}
              >
                ⚰️ Deceased (মৃত)
              </Button>
            </div>
          </div>
        </div>

        {/* Branching Logic for Deceased Successors (Sections 4, 13, 14) */}
        {node.is_deceased ? (
          <div className="rounded-md border border-amber-200 bg-amber-50/40 dark:bg-amber-950/20 p-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <GitFork className="h-4 w-4 text-amber-600" />
                Does this deceased successor have successor(s)? / এই মৃত উত্তরসূরির কি ওয়ারিশান আছে?
              </Label>
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant={node.has_successors ? "default" : "outline"}
                  disabled={readOnly}
                  onClick={() => updateSuccessor(node.id, { has_successors: true })}
                  className={`h-7 px-3 text-xs ${node.has_successors ? "bg-amber-700 text-white" : ""}`}
                >
                  Yes / হ্যাঁ
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={!node.has_successors ? "default" : "outline"}
                  disabled={readOnly}
                  onClick={() => updateSuccessor(node.id, { has_successors: false })}
                  className={`h-7 px-3 text-xs ${!node.has_successors ? "bg-muted text-foreground font-medium" : ""}`}
                >
                  No / না
                </Button>
              </div>
            </div>

            {/* If Yes: Open child successor section (Section 14 & 22) */}
            {node.has_successors && (
              <div className="pt-2 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/80 pb-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-100">
                      SUCCESSORS OF Late {node.name || "Parent"}
                    </h4>
                    <p className="text-[11px] text-muted-foreground italic">
                      "That the successors of Late {node.name || "Parent"} are noted below:"
                    </p>
                  </div>
                  {!readOnly && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addChildSuccessor(node)}
                      className="h-8 text-xs border-amber-300 hover:bg-amber-100/50 dark:hover:bg-amber-900/30"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1 text-amber-700" />
                      Add Successor of Late {node.name || node.serial_code}
                    </Button>
                  )}
                </div>

                {/* Recursive Children List */}
                {children.length > 0 ? (
                  <div className="space-y-3">
                    {children.map((child) =>
                      renderSuccessorNode(child, node.name || node.serial_code, depth + 1)
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic p-2 bg-background/50 rounded border border-dashed">
                    Click "Add Successor" above to enter child heirs under Late {node.name || "this successor"}.
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 px-2 py-1 bg-muted/40 rounded">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Living successor. Terminal node (no child successors under living heirs per legal schedule).</span>
          </div>
        )}
      </div>
    );
  };

  const asciiPreview = useMemo(
    () => generateSuccessorTreePreview(successors),
    [successors]
  );

  return (
    <div className="space-y-6">
      {/* Drafting Header Context (Section 12 & 22) */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <span>DIRECT SUCCESSORS OF</span>
              <span className="text-primary underline decoration-primary/40">
                {deceasedName ? `Late ${deceasedName}` : "Deceased Person"}
              </span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Legal heir drafting hierarchy under Bagula II Gram Panchayat schedule.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant={isDirectLimitReached ? "destructive" : "secondary"}
              className="text-xs font-mono font-semibold"
            >
              Direct Successors: {directCount} / {MAX_DIRECT_SUCCESSORS}
            </Badge>

            {!readOnly && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={loadStandardTestCase}
                className="text-xs h-8 border-dashed gap-1 text-muted-foreground hover:text-foreground"
                title="Loads the official Chakraborty 5-generation test case (Baloram -> Krishno Gopal -> Nandadulal -> Himadri / Proshanta)"
              >
                <Sparkles className="h-3 w-3 text-amber-500" />
                Fill Test Case
              </Button>
            )}
          </div>
        </div>

        {/* Legal Principle Warning (Section 15) */}
        <div className="rounded border border-primary/20 bg-primary/5 p-2.5 text-xs text-muted-foreground flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div>
            <strong className="text-foreground">Authoritative Legal Principle: </strong>
            Every successor's recorded <span className="font-semibold text-foreground">Relation</span> is
            strictly with respect to the original Deceased Person (
            {deceasedName ? `Late ${deceasedName}` : "Deceased"}). Deterministic prefixes (
            <code className="font-mono text-primary font-semibold">1</code>,{" "}
            <code className="font-mono text-primary font-semibold">1/A</code>,{" "}
            <code className="font-mono text-primary font-semibold">1/A/I</code>,{" "}
            <code className="font-mono text-primary font-semibold">1/A/I/1</code>) are system-generated and
            cannot be manually altered.
          </div>
        </div>
      </div>

      {/* Validation Banner (Section 30) */}
      {!validation.valid && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive space-y-1">
          <p className="font-semibold flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4" /> Hierarchy Validation Warnings:
          </p>
          <ul className="list-disc pl-5 space-y-0.5">
            {validation.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Direct Successors List */}
      <div className="space-y-4">
        {tree.map((root) =>
          renderSuccessorNode(root, deceasedName || "Deceased", 0)
        )}

        {tree.length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center space-y-3">
            <User className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <div>
              <p className="text-sm font-medium">No successors recorded yet.</p>
              <p className="text-xs text-muted-foreground">
                Click "Add Direct Successor" below to begin the heir list for Late {deceasedName || "Deceased"}.
              </p>
            </div>
          </div>
        )}

        {!readOnly && (
          <div className="pt-2 flex justify-start">
            <Button
              type="button"
              onClick={addDirectSuccessor}
              disabled={isDirectLimitReached}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Direct Successor (Max {MAX_DIRECT_SUCCESSORS})
            </Button>
          </div>
        )}
      </div>

      {/* Compact Hierarchy Tree Preview (Section 23) */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div
          className="flex items-center justify-between cursor-pointer select-none"
          onClick={() => setShowTreePreview((p) => !p)}
        >
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <GitFork className="h-3.5 w-3.5 text-primary" />
            Compact Hierarchy Tree Preview (Drafting Preview)
          </h4>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            {showTreePreview ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>

        {showTreePreview && (
          <div className="space-y-2">
            <pre className="rounded bg-muted/60 p-3 text-xs font-mono whitespace-pre overflow-x-auto text-foreground border leading-relaxed">
              {asciiPreview}
            </pre>
            <p className="text-[11px] text-muted-foreground">
              Total Successors: {successors.length} (Direct: {directCount}, Descendants:{" "}
              {successors.length - directCount}).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
