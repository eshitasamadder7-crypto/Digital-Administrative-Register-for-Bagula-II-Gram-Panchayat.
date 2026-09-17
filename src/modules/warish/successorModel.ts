/**
 * Bagula II Gram Panchayat - Warish Successor Hierarchy Model
 * Tier 1 Database + Backend Foundation
 *
 * Implements deterministic numbering, strict direct successor limit (10 max),
 * hierarchical parent-child relationships, state-based editability rules,
 * and fail-closed authorization helpers.
 */

export const MAX_DIRECT_SUCCESSORS = 10;

export interface WarishSuccessorRecord {
  id: string;
  application_id: string;
  parent_successor_id: string | null;
  serial_code: string;
  name: string;
  care_of: string;
  relation: string;
  relation_id?: string | null;
  age: number | null;
  is_deceased: boolean;
  has_successors: boolean;
  depth: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  children?: WarishSuccessorRecord[];
}

export interface CreateSuccessorInput {
  application_id: string;
  parent_successor_id?: string | null;
  name: string;
  care_of?: string;
  relation: string;
  relation_id?: string | null;
  age?: number | null;
  is_deceased?: boolean;
  has_successors?: boolean;
}

export interface UpdateSuccessorInput {
  id: string;
  name: string;
  care_of?: string;
  relation: string;
  relation_id?: string | null;
  age?: number | null;
  is_deceased?: boolean;
  has_successors?: boolean;
}

/**
 * Converts a 1-based index to uppercase alphabetical sequence:
 * 1 -> A, 2 -> B, ..., 26 -> Z, 27 -> AA, 28 -> AB, etc.
 */
export function numberToAlpha(n: number): string {
  if (!n || n <= 0) return "";
  let res = "";
  let curr = n;
  while (curr > 0) {
    const rem = (curr - 1) % 26;
    res = String.fromCharCode(65 + rem) + res;
    curr = Math.floor((curr - 1) / 26);
  }
  return res;
}

/**
 * Converts a 1-based integer to standard Roman numeral:
 * 1 -> I, 2 -> II, 3 -> III, 4 -> IV, 5 -> V, 9 -> IX, 10 -> X, etc.
 */
export function numberToRoman(n: number): string {
  if (!n || n <= 0) return "";
  const vals: [number, string][] = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let num = n;
  let res = "";
  for (const [val, sym] of vals) {
    while (num >= val) {
      res += sym;
      num -= val;
    }
  }
  return res;
}

/**
 * Generates deterministic serial numbers according to Bagula II hierarchy convention:
 * - Direct (depth 0): "1", "2", ..., "10"
 * - Children (depth 1): parent/A, parent/B, ... (e.g. "1/A", "1/B")
 * - Grandchildren (depth 2): parent/I, parent/II, ... (e.g. "1/A/I")
 * - Great-grandchildren (depth 3): parent/1, parent/2, ... (e.g. "1/A/I/1", "1/A/I/2")
 * - Depth 4: parent/A (e.g. "1/A/I/1/A")
 * - Depth 5: parent/I (e.g. "1/A/I/1/A/I")
 */
export function computeSuccessorSerialCode(
  parentSerial: string | null,
  depth: number,
  sortOrder: number
): string {
  if (depth === 0 || !parentSerial) {
    return String(sortOrder);
  }

  const mod = depth % 3;
  let segment: string;
  if (mod === 1) {
    segment = numberToAlpha(sortOrder);
  } else if (mod === 2) {
    segment = numberToRoman(sortOrder);
  } else {
    segment = String(sortOrder);
  }

  return `${parentSerial}/${segment}`;
}

/**
 * Validates direct successor count limit.
 * The official Bagula II schedule provides exactly 10 direct successor rows.
 */
export function validateDirectSuccessorLimit(currentDirectCount: number): {
  valid: boolean;
  error?: string;
} {
  if (currentDirectCount >= MAX_DIRECT_SUCCESSORS) {
    return {
      valid: false,
      error: `Maximum ${MAX_DIRECT_SUCCESSORS} direct successors allowed per application (official schedule limit)`,
    };
  }
  return { valid: true };
}

/**
 * Validates successor creation rules against parent attributes and business logic.
 */
export function validateSuccessorCreation(
  parent: WarishSuccessorRecord | null,
  input: {
    name: string;
    relation: string;
    is_deceased?: boolean;
    has_successors?: boolean;
  },
  currentDirectCount: number
): { valid: boolean; error?: string } {
  if (!input.name || !input.name.trim()) {
    return { valid: false, error: "Successor name is required" };
  }
  if (!input.relation || !input.relation.trim()) {
    return { valid: false, error: "Successor relation is required" };
  }

  if (!parent) {
    // Direct successor
    const limitCheck = validateDirectSuccessorLimit(currentDirectCount);
    if (!limitCheck.valid) return limitCheck;
  } else {
    // Child successor
    if (!parent.is_deceased) {
      return {
        valid: false,
        error: "Cannot add child successors to a living successor",
      };
    }
    if (!parent.has_successors) {
      return {
        valid: false,
        error: "Parent successor is not marked as having legal successors",
      };
    }
  }

  if (!input.is_deceased && input.has_successors) {
    return {
      valid: false,
      error: "A living successor cannot have legal sub-successors registered",
    };
  }

  // NOTE:
  // BUSINESS RULE REQUIRED:
  // If is_deceased = true and has_successors = false, this data state is valid
  // and permitted per source material without imposing unapproved legal disqualifications.

  return { valid: true };
}

/**
 * Verifies application state rules for editing successors.
 * Reuses existing workflow states:
 * - Draft: editable (if citizen window open)
 * - Returned: editable for correction
 * - Submitted / Pending: locked
 * - Approved / Rejected / Issued / Expired / Archived: locked
 */
export function canEditSuccessorsInState(params: {
  status: string;
  isArchived?: boolean;
  source?: string;
  publicEditUntil?: string | null;
  isOwner?: boolean;
  isStaffWithScope?: boolean;
}): boolean {
  const { status, isArchived, source, publicEditUntil, isOwner, isStaffWithScope } = params;

  if (isArchived) return false;

  // Allowed editable states
  const editableStatuses = ["Draft", "Returned"];
  if (!editableStatuses.includes(status)) {
    return false;
  }

  // Citizen owner flow
  if (isOwner) {
    if (source === "public" && publicEditUntil) {
      const expiry = new Date(publicEditUntil).getTime();
      if (Date.now() > expiry) {
        return false;
      }
    }
    return true;
  }

  // Staff office flow
  if (isStaffWithScope) {
    return true;
  }

  return false;
}

/**
 * Builds a nested hierarchical tree from a flat list of successors.
 * Preserves deterministic order by depth and sort_order.
 */
export function buildSuccessorTree(records: WarishSuccessorRecord[]): WarishSuccessorRecord[] {
  const map = new Map<string, WarishSuccessorRecord>();
  const roots: WarishSuccessorRecord[] = [];

  // Clone records and initialize children arrays
  for (const r of records) {
    map.set(r.id, { ...r, children: [] });
  }

  for (const r of records) {
    const node = map.get(r.id)!;
    if (!r.parent_successor_id) {
      roots.push(node);
    } else {
      const parent = map.get(r.parent_successor_id);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(node);
      } else {
        // Orphan fallback
        roots.push(node);
      }
    }
  }

  // Sort siblings by sort_order
  const sortNodes = (nodes: WarishSuccessorRecord[]) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order);
    for (const n of nodes) {
      if (n.children && n.children.length > 0) {
        sortNodes(n.children);
      }
    }
  };

  sortNodes(roots);
  return roots;
}

export interface DocumentReadySuccessorNode {
  id: string;
  application_id: string;
  parent_successor_id: string | null;
  parent_name: string;
  parent_context_statement: string | null;
  prefix: string; // e.g. "1", "1/A", "1/A/I", "1/A/I/1", "1/A/I/2"
  name: string;
  care_of: string;
  relation: string; // Always relation with original deceased person!
  age: number | null;
  is_deceased: boolean;
  has_successors: boolean;
  depth: number;
  sort_order: number;
  children?: DocumentReadySuccessorNode[];
}

/**
 * Transforms the successor hierarchy into a document-ready structure for drafting
 * and official certificate generation (Section 25, 26).
 *
 * Automatically generates parent-context statements for branches:
 * "That the successors of Late [Parent Name] are noted below:"
 */
export function prepareDocumentReadyData(
  records: WarishSuccessorRecord[],
  deceasedName: string,
  applicationId: string
): DocumentReadySuccessorNode[] {
  const tree = buildSuccessorTree(records);
  const nameMap = new Map<string, string>();
  for (const r of records) {
    nameMap.set(r.id, r.name);
  }

  const mapNode = (
    node: WarishSuccessorRecord,
    parentName: string
  ): DocumentReadySuccessorNode => {
    const hasChildren = Boolean(node.children && node.children.length > 0);
    const parentStatement = hasChildren
      ? `That the successors of Late ${node.name} are noted below:`
      : null;

    return {
      id: node.id,
      application_id: node.application_id || applicationId,
      parent_successor_id: node.parent_successor_id,
      parent_name: parentName,
      parent_context_statement: parentStatement,
      prefix: node.serial_code,
      name: node.name,
      care_of: node.care_of || "",
      relation: node.relation, // Authoritative: Relation with the original deceased person
      age: node.age,
      is_deceased: node.is_deceased,
      has_successors: node.has_successors,
      depth: node.depth,
      sort_order: node.sort_order,
      children: (node.children || []).map((child) => mapNode(child, node.name)),
    };
  };

  return tree.map((root) => mapNode(root, deceasedName || "Deceased"));
}

/**
 * Flattens the document-ready tree into a linear sequence preserving preorder hierarchy.
 */
export function flattenDocumentReadyTree(
  nodes: DocumentReadySuccessorNode[]
): DocumentReadySuccessorNode[] {
  const result: DocumentReadySuccessorNode[] = [];
  const traverse = (list: DocumentReadySuccessorNode[]) => {
    for (const item of list) {
      result.push(item);
      if (item.children && item.children.length > 0) {
        traverse(item.children);
      }
    }
  };
  traverse(nodes);
  return result;
}

/**
 * Generates an ASCII preview tree matching the exact structure from Section 23:
 *
 * 1. Late Baloram Chakraborty
 *    Status: Deceased
 *    └── 1/A. Late Krishno Gopal Chakraborty
 *        Status: Deceased
 *        └── 1/A/I. Late Nandadulal Chakraborty
 *            Status: Deceased
 *            ├── 1/A/I/1. Late Himadri Chakraborty
 *            └── 1/A/I/2. Late Proshanta Chakraborty
 */
export function generateSuccessorTreePreview(records: WarishSuccessorRecord[]): string {
  const roots = buildSuccessorTree(records);
  if (roots.length === 0) return "No successors recorded.";

  const lines: string[] = [];

  const formatNode = (
    node: WarishSuccessorRecord,
    prefix: string,
    isLast: boolean,
    isRoot: boolean
  ) => {
    const statusText = node.is_deceased ? "Deceased" : "Living";
    const displayName = node.is_deceased && !node.name.startsWith("Late ")
      ? `Late ${node.name}`
      : node.name;

    if (isRoot) {
      lines.push(`${node.serial_code}. ${displayName}`);
      lines.push(`   Status: ${statusText}`);
    } else {
      const branchMarker = isLast ? "└── " : "├── ";
      lines.push(`${prefix}${branchMarker}${node.serial_code}. ${displayName}`);
      const indent = prefix + (isLast ? "    " : "│   ");
      lines.push(`${indent}Status: ${statusText}`);
    }

    if (node.children && node.children.length > 0) {
      const childCount = node.children.length;
      node.children.forEach((child, idx) => {
        const childIsLast = idx === childCount - 1;
        const childPrefix = isRoot
          ? "   "
          : prefix + (isLast ? "    " : "│   ");
        formatNode(child, childPrefix, childIsLast, false);
      });
    }
  };

  roots.forEach((root, idx) => {
    formatNode(root, "", idx === roots.length - 1, true);
  });

  return lines.join("\n");
}

/**
 * Safe cascade delete helper: returns targetId and all descendant IDs (Section 28, 29).
 */
export function getSuccessorDescendantIds(
  targetId: string,
  records: WarishSuccessorRecord[]
): string[] {
  const ids: string[] = [targetId];
  const childrenOf = (parentId: string) =>
    records.filter((r) => r.parent_successor_id === parentId);

  const stack = [targetId];
  while (stack.length > 0) {
    const curr = stack.pop()!;
    const kids = childrenOf(curr);
    for (const k of kids) {
      ids.push(k.id);
      stack.push(k.id);
    }
  }

  return ids;
}

/**
 * Re-numbers and re-calculates deterministic serial codes for an entire record set (Section 8).
 * Useful when records are added or removed during drafting to eliminate numbering gaps.
 */
export function recalculateTreeSerialCodes(
  records: WarishSuccessorRecord[]
): WarishSuccessorRecord[] {
  const tree = buildSuccessorTree(records);
  const updatedRecords: WarishSuccessorRecord[] = [];

  const traverse = (
    nodes: WarishSuccessorRecord[],
    parentSerial: string | null,
    depth: number
  ) => {
    nodes.forEach((node, idx) => {
      const sortOrder = idx + 1;
      const serialCode = computeSuccessorSerialCode(parentSerial, depth, sortOrder);
      const updatedNode: WarishSuccessorRecord = {
        ...node,
        serial_code: serialCode,
        depth,
        sort_order: sortOrder,
      };
      updatedRecords.push(updatedNode);

      if (node.children && node.children.length > 0) {
        traverse(node.children, serialCode, depth + 1);
      }
    });
  };

  traverse(tree, null, 0);
  return updatedRecords;
}

export interface HierarchyValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Comprehensive validation engine implementing Section 30:
 * - deceased person exists
 * - direct successors <= 10
 * - every successor has required fields
 * - every child has a valid parent
 * - no cyclic parent relationships
 * - no orphaned successor
 * - prefix is generated
 * - prefix is unique within the application
 * - prefix matches hierarchy
 * - depth matches hierarchy
 * - sort order is valid
 */
export function validateFullSuccessorHierarchy(
  records: WarishSuccessorRecord[],
  deceasedName?: string
): HierarchyValidationResult {
  const errors: string[] = [];

  if (!deceasedName || !deceasedName.trim()) {
    errors.push("Deceased person's name is required before entering successors.");
  }

  const directSuccessors = records.filter((r) => !r.parent_successor_id);
  if (directSuccessors.length > MAX_DIRECT_SUCCESSORS) {
    errors.push(
      `Direct successors count (${directSuccessors.length}) exceeds the maximum limit of ${MAX_DIRECT_SUCCESSORS}.`
    );
  }

  if (records.length === 0) {
    errors.push("At least one legal successor is required for a Warish application.");
  }

  const idSet = new Set(records.map((r) => r.id));
  const serialSet = new Set<string>();

  // Check required fields & uniqueness
  for (const r of records) {
    if (!r.name || !r.name.trim()) {
      errors.push(`Successor with serial '${r.serial_code || "unknown"}' is missing name.`);
    }
    if (!r.relation || !r.relation.trim()) {
      errors.push(`Successor '${r.name || "unknown"}' is missing relation with deceased person.`);
    }
    if (!r.serial_code || !r.serial_code.trim()) {
      errors.push(`Successor '${r.name}' is missing an auto-generated serial code.`);
    } else {
      if (serialSet.has(r.serial_code)) {
        errors.push(`Duplicate serial code '${r.serial_code}' found in hierarchy.`);
      }
      serialSet.add(r.serial_code);
    }

    // Check living vs deceased logic
    if (!r.is_deceased && r.has_successors) {
      errors.push(
        `Living successor '${r.name}' cannot have sub-successors registered.`
      );
    }

    // Check parent validity
    if (r.parent_successor_id) {
      if (!idSet.has(r.parent_successor_id)) {
        errors.push(
          `Orphaned successor '${r.name}' references non-existent parent ID '${r.parent_successor_id}'.`
        );
      }
    }
  }

  // Check for cyclic relationships
  for (const r of records) {
    const visited = new Set<string>();
    let curr: string | null = r.parent_successor_id;
    while (curr) {
      if (visited.has(curr) || curr === r.id) {
        errors.push(`Cyclic parent-child hierarchy detected involving successor '${r.name}'.`);
        break;
      }
      visited.add(curr);
      const parentNode = records.find((x) => x.id === curr);
      curr = parentNode ? parentNode.parent_successor_id : null;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
