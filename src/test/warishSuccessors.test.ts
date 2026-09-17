import { describe, it, expect } from "vitest";
import {
  computeSuccessorSerialCode,
  numberToAlpha,
  numberToRoman,
  validateDirectSuccessorLimit,
  validateSuccessorCreation,
  canEditSuccessorsInState,
  buildSuccessorTree,
  MAX_DIRECT_SUCCESSORS,
  type WarishSuccessorRecord,
} from "@/modules/warish/successorModel";

describe("Warish Successor Hierarchy & Backend Rules (Tier 1 Foundation)", () => {
  const baseAppId = "app-warish-001";

  const createMockSuccessor = (
    overrides: Partial<WarishSuccessorRecord>
  ): WarishSuccessorRecord => ({
    id: overrides.id || "succ-001",
    application_id: overrides.application_id || baseAppId,
    parent_successor_id: overrides.parent_successor_id ?? null,
    serial_code: overrides.serial_code || "1",
    name: overrides.name || "Test Heir",
    care_of: overrides.care_of || "",
    relation: overrides.relation || "Son",
    age: overrides.age ?? 35,
    is_deceased: overrides.is_deceased ?? false,
    has_successors: overrides.has_successors ?? false,
    depth: overrides.depth ?? 0,
    sort_order: overrides.sort_order ?? 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  });

  // 1. direct successor creation
  it("1. direct successor creation: creates root successors at depth 0 with sequential codes", () => {
    const direct1 = createMockSuccessor({
      parent_successor_id: null,
      sort_order: 1,
      depth: 0,
      serial_code: computeSuccessorSerialCode(null, 0, 1),
    });
    expect(direct1.parent_successor_id).toBeNull();
    expect(direct1.depth).toBe(0);
    expect(direct1.serial_code).toBe("1");

    const direct2 = createMockSuccessor({
      parent_successor_id: null,
      sort_order: 2,
      depth: 0,
      serial_code: computeSuccessorSerialCode(null, 0, 2),
    });
    expect(direct2.serial_code).toBe("2");
  });

  // 2. maximum 10 direct successors
  it("2. maximum 10 direct successors: permits up to 10 direct rows matching official schedule", () => {
    for (let count = 0; count < 10; count++) {
      const check = validateDirectSuccessorLimit(count);
      expect(check.valid).toBe(true);
    }
  });

  // 3. 11th direct successor rejected
  it("3. 11th direct successor rejected: backend strictly rejects 11th direct row", () => {
    const check11 = validateDirectSuccessorLimit(10);
    expect(check11.valid).toBe(false);
    expect(check11.error).toContain("Maximum 10 direct successors allowed");

    const check12 = validateDirectSuccessorLimit(11);
    expect(check12.valid).toBe(false);
    expect(check12.error).toContain("Maximum 10 direct successors allowed");
  });

  // 4. child successor creation
  it("4. child successor creation: assigns depth 1 and letter suffix (A, B, ...)", () => {
    const parent = createMockSuccessor({
      id: "parent-1",
      serial_code: "1",
      depth: 0,
      is_deceased: true,
      has_successors: true,
    });

    const validation = validateSuccessorCreation(
      parent,
      { name: "Child One", relation: "Son" },
      1
    );
    expect(validation.valid).toBe(true);

    const childSerialA = computeSuccessorSerialCode(parent.serial_code, 1, 1);
    expect(childSerialA).toBe("1/A");

    const childSerialB = computeSuccessorSerialCode(parent.serial_code, 1, 2);
    expect(childSerialB).toBe("1/B");
  });

  // 5. grandchild successor creation
  it("5. grandchild successor creation: assigns depth 2 and Roman numerals (I, II, ...)", () => {
    const childNode = createMockSuccessor({
      id: "child-1-a",
      parent_successor_id: "parent-1",
      serial_code: "1/A",
      depth: 1,
      is_deceased: true,
      has_successors: true,
    });

    const grandChild1 = computeSuccessorSerialCode(childNode.serial_code, 2, 1);
    expect(grandChild1).toBe("1/A/I");

    const grandChild2 = computeSuccessorSerialCode(childNode.serial_code, 2, 2);
    expect(grandChild2).toBe("1/A/II");
    expect(computeSuccessorSerialCode("1/A", 2, 3)).toBe("1/A/III");
  });

  // 6. deeper hierarchy
  it("6. deeper hierarchy: supports recursive levels (depth 3 numbers, depth 4 letters, depth 5 Roman)", () => {
    // Depth 3: Numbers
    const depth3_1 = computeSuccessorSerialCode("1/A/I", 3, 1);
    expect(depth3_1).toBe("1/A/I/1");

    const depth3_2 = computeSuccessorSerialCode("1/A/I", 3, 2);
    expect(depth3_2).toBe("1/A/I/2");

    // Depth 4: Letters
    const depth4_A = computeSuccessorSerialCode("1/A/I/2", 4, 1);
    expect(depth4_A).toBe("1/A/I/2/A");

    // Depth 5: Roman
    const depth5_I = computeSuccessorSerialCode("1/A/I/2/A", 5, 1);
    expect(depth5_I).toBe("1/A/I/2/A/I");
  });

  // 7. automatic serial numbers
  it("7. automatic serial numbers: exactly generates the required specification tree", () => {
    // 1 -> 1/A -> 1/A/I -> 1/A/I/1 -> 1/A/I/2
    const s1 = computeSuccessorSerialCode(null, 0, 1);
    expect(s1).toBe("1");

    const s1A = computeSuccessorSerialCode(s1, 1, 1);
    expect(s1A).toBe("1/A");

    const s1AI = computeSuccessorSerialCode(s1A, 2, 1);
    expect(s1AI).toBe("1/A/I");

    const s1AI1 = computeSuccessorSerialCode(s1AI, 3, 1);
    expect(s1AI1).toBe("1/A/I/1");

    const s1AI2 = computeSuccessorSerialCode(s1AI, 3, 2);
    expect(s1AI2).toBe("1/A/I/2");
  });

  // 8. duplicate serial prevention
  it("8. duplicate serial prevention: produces unique, collision-free deterministic codes", () => {
    const serials = new Set<string>();
    for (let direct = 1; direct <= MAX_DIRECT_SUCCESSORS; direct++) {
      const code = computeSuccessorSerialCode(null, 0, direct);
      expect(serials.has(code)).toBe(false);
      serials.add(code);
    }
    expect(serials.size).toBe(10);

    const childSerials = new Set<string>();
    for (let sibling = 1; sibling <= 5; sibling++) {
      const childCode = computeSuccessorSerialCode("1", 1, sibling);
      expect(childSerials.has(childCode)).toBe(false);
      childSerials.add(childCode);
    }
    expect(Array.from(childSerials)).toEqual(["1/A", "1/B", "1/C", "1/D", "1/E"]);
  });

  // 9. parent-child relationship
  it("9. parent-child relationship: validates deceased status and has_successors flag", () => {
    const livingParent = createMockSuccessor({
      is_deceased: false,
      has_successors: false,
    });
    const resLiving = validateSuccessorCreation(
      livingParent,
      { name: "Child", relation: "Son" },
      1
    );
    expect(resLiving.valid).toBe(false);
    expect(resLiving.error).toContain("Cannot add child successors to a living successor");

    const deceasedWithoutSuccessors = createMockSuccessor({
      is_deceased: true,
      has_successors: false,
    });
    const resNoSucc = validateSuccessorCreation(
      deceasedWithoutSuccessors,
      { name: "Child", relation: "Son" },
      1
    );
    expect(resNoSucc.valid).toBe(false);
    expect(resNoSucc.error).toContain("Parent successor is not marked as having legal successors");

    // BUSINESS RULE REQUIRED:
    // A successor who is deceased with has_successors = false is valid as a record
    const deceasedRecordCheck = validateSuccessorCreation(
      null,
      { name: "Late Uncle", relation: "Brother", is_deceased: true, has_successors: false },
      1
    );
    expect(deceasedRecordCheck.valid).toBe(true);

    // Living successor cannot have has_successors = true
    const invalidLiving = validateSuccessorCreation(
      null,
      { name: "Living Person", relation: "Son", is_deceased: false, has_successors: true },
      1
    );
    expect(invalidLiving.valid).toBe(false);
    expect(invalidLiving.error).toContain("living successor cannot have legal sub-successors registered");
  });

  // 10. Citizen ownership
  it("10. Citizen ownership: allows citizen owner to edit during open public draft window", () => {
    const futureTime = new Date(Date.now() + 1000 * 60 * 60).toISOString();
    const canEdit = canEditSuccessorsInState({
      status: "Draft",
      isArchived: false,
      source: "public",
      publicEditUntil: futureTime,
      isOwner: true,
      isStaffWithScope: false,
    });
    expect(canEdit).toBe(true);
  });

  // 11. cross-Citizen denial
  it("11. cross-Citizen denial: non-owner citizen is strictly denied access", () => {
    const canEdit = canEditSuccessorsInState({
      status: "Draft",
      isArchived: false,
      source: "public",
      publicEditUntil: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      isOwner: false, // User B trying to edit User A's application
      isStaffWithScope: false,
    });
    expect(canEdit).toBe(false);
  });

  // 12. unauthorized RPC denial
  it("12. unauthorized RPC denial: unauthenticated or out-of-scope staff are denied", () => {
    // Unauthenticated (no owner, no staff)
    const unauthenticated = canEditSuccessorsInState({
      status: "Draft",
      isArchived: false,
      isOwner: false,
      isStaffWithScope: false,
    });
    expect(unauthenticated).toBe(false);

    // DEO without warish scope
    const outOfScopeStaff = canEditSuccessorsInState({
      status: "Draft",
      isArchived: false,
      isOwner: false,
      isStaffWithScope: false,
    });
    expect(outOfScopeStaff).toBe(false);
  });

  // 13. submitted application protection
  it("13. submitted application protection: locked when submitted, approved, rejected, or issued", () => {
    const nonEditableStatuses = [
      "Pending Signature & Memo Registration",
      "Submitted",
      "Approved",
      "Rejected",
      "Issued",
      "Draft Expired",
    ];

    for (const status of nonEditableStatuses) {
      const citizenCheck = canEditSuccessorsInState({
        status,
        isArchived: false,
        source: "public",
        isOwner: true,
      });
      expect(citizenCheck).toBe(false);

      const staffCheck = canEditSuccessorsInState({
        status,
        isArchived: false,
        isOwner: false,
        isStaffWithScope: true,
      });
      expect(staffCheck).toBe(false);
    }

    // Archived application is also always locked
    const archivedCheck = canEditSuccessorsInState({
      status: "Draft",
      isArchived: true,
      isOwner: true,
      isStaffWithScope: true,
    });
    expect(archivedCheck).toBe(false);
  });

  // 14. Returned application correction compatibility
  it("14. Returned application correction compatibility: allows correction editing when Returned", () => {
    const returnedCitizen = canEditSuccessorsInState({
      status: "Returned",
      isArchived: false,
      source: "public",
      publicEditUntil: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      isOwner: true,
      isStaffWithScope: false,
    });
    expect(returnedCitizen).toBe(true);

    const returnedStaff = canEditSuccessorsInState({
      status: "Returned",
      isArchived: false,
      isOwner: false,
      isStaffWithScope: true,
    });
    expect(returnedStaff).toBe(true);
  });

  // Tree building verification
  it("builds nested hierarchy from flat list of successors", () => {
    const records: WarishSuccessorRecord[] = [
      createMockSuccessor({ id: "1", parent_successor_id: null, serial_code: "1", sort_order: 1, depth: 0 }),
      createMockSuccessor({ id: "2", parent_successor_id: null, serial_code: "2", sort_order: 2, depth: 0 }),
      createMockSuccessor({ id: "1-A", parent_successor_id: "1", serial_code: "1/A", sort_order: 1, depth: 1 }),
      createMockSuccessor({ id: "1-B", parent_successor_id: "1", serial_code: "1/B", sort_order: 2, depth: 1 }),
      createMockSuccessor({ id: "1-A-I", parent_successor_id: "1-A", serial_code: "1/A/I", sort_order: 1, depth: 2 }),
    ];

    const tree = buildSuccessorTree(records);
    expect(tree.length).toBe(2);
    expect(tree[0].id).toBe("1");
    expect(tree[0].children?.length).toBe(2);
    expect(tree[0].children?.[0].id).toBe("1-A");
    expect(tree[0].children?.[0].children?.length).toBe(1);
    expect(tree[0].children?.[0].children?.[0].id).toBe("1-A-I");
    expect(tree[1].id).toBe("2");
    expect(tree[1].children?.length).toBe(0);
  });

  // Test Case: Section 44 - 5-generation hierarchy with deterministic serial codes
  it("correctly models the official 5-generation Chakraborty family hierarchy", () => {
    const baloram = createMockSuccessor({
      id: "node-1",
      parent_successor_id: null,
      name: "Late Baloram Chakraborty",
      is_deceased: true,
      has_successors: true,
      depth: 0,
      sort_order: 1,
      serial_code: "1",
    });
    const krishnoGopal = createMockSuccessor({
      id: "node-1-A",
      parent_successor_id: "node-1",
      name: "Late Krishno Gopal Chakraborty",
      is_deceased: true,
      has_successors: true,
      depth: 1,
      sort_order: 1,
      serial_code: "1/A",
    });
    const nandadulal = createMockSuccessor({
      id: "node-1-A-I",
      parent_successor_id: "node-1-A",
      name: "Late Nandadulal Chakraborty",
      is_deceased: true,
      has_successors: true,
      depth: 2,
      sort_order: 1,
      serial_code: "1/A/I",
    });
    const himadri = createMockSuccessor({
      id: "node-1-A-I-1",
      parent_successor_id: "node-1-A-I",
      name: "Late Himadri Chakraborty",
      is_deceased: true,
      has_successors: false,
      depth: 3,
      sort_order: 1,
      serial_code: "1/A/I/1",
    });
    const proshanta = createMockSuccessor({
      id: "node-1-A-I-2",
      parent_successor_id: "node-1-A-I",
      name: "Late Proshanta Chakraborty",
      is_deceased: true,
      has_successors: false,
      depth: 3,
      sort_order: 2,
      serial_code: "1/A/I/2",
    });

    const records = [baloram, krishnoGopal, nandadulal, himadri, proshanta];
    const tree = buildSuccessorTree(records);

    expect(tree.length).toBe(1);
    expect(tree[0].serial_code).toBe("1");
    expect(tree[0].children?.[0].serial_code).toBe("1/A");
    expect(tree[0].children?.[0].children?.[0].serial_code).toBe("1/A/I");
    expect(tree[0].children?.[0].children?.[0].children?.length).toBe(2);
    expect(tree[0].children?.[0].children?.[0].children?.[0].serial_code).toBe("1/A/I/1");
    expect(tree[0].children?.[0].children?.[0].children?.[1].serial_code).toBe("1/A/I/2");
  });
});
