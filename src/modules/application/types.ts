export type ApplicationKind = "warish" | "dependent" | "linkage";

export const KIND_LABEL: Record<ApplicationKind, string> = {
  warish: "Warish Certificate",
  dependent: "Dependent Certificate",
  linkage: "Linkage Certificate",
};

export const KIND_TABLE: Record<
  ApplicationKind,
  "warish_certificates" | "dependent_certificates" | "linkage_certificates"
> = {
  warish: "warish_certificates",
  dependent: "dependent_certificates",
  linkage: "linkage_certificates",
};

/** Generator page that owns the final PDF for each kind. */
export const KIND_GENERATOR_ROUTE: Record<ApplicationKind, string> = {
  warish: "/warish-certificate",
  dependent: "/dependent-certificate",
  linkage: "/linkage-certificate",
};

export interface ApplicantInfo {
  prefix: string;
  name: string;
  relationType: string;
  guardianName: string;
  village: string;
  villageManual: string;
  postOffice: string;
  postOfficeManual: string;
  policeStation: string;
  block: string;
  district: string;
  pin: string;
  epicNo: string;
  aadhaarLast4: string;
  mobile: string;
  email: string;
}

export const EMPTY_APPLICANT: ApplicantInfo = {
  prefix: "Shri",
  name: "",
  relationType: "S/O",
  guardianName: "",
  village: "",
  villageManual: "",
  postOffice: "",
  postOfficeManual: "",
  policeStation: "Hanskhali",
  block: "Hanskhali",
  district: "Nadia",
  pin: "741502",
  epicNo: "",
  aadhaarLast4: "",
  mobile: "",
  email: "",
};

export interface WarishHeir {
  name: string;
  relation: string;
  age: string;
  hasLegalSuccessors: "" | "yes" | "no";
}

import type { WarishSuccessorRecord } from "@/modules/warish/successorModel";

export interface DependentPerson {
  relation: string;
  title: string;
  name: string;
  parentRelType: string;
  parentName: string;
}

export interface WarishDetails {
  deceasedName: string;
  fatherPrefix: string;
  fatherName: string;
  relationToGuardian?: string;
  permanentAddress?: string;
  village?: string;
  village_id?: string;
  postOffice?: string;
  post_office_id?: string;
  policeStation?: string;
  district?: string;
  pin?: string;
  dateOfDeath: string;
  placeOfDeath?: string;
  causeOfDeath?: string;
  ageAtDeath?: string;
  applicantRelation: string;
  applicant_relation_id?: string;
  heirs: WarishHeir[];
  successors?: WarishSuccessorRecord[];
}

export interface DependentDetails {
  applicantIsEmployee: boolean;
  empName: string;
  empId: string;
  dept: string;
  deptManual: string;
  dependents: DependentPerson[];
}

export interface LinkageParentElectoralRecord {
  id?: string;
  name: string;
  relation: string; // "Father" | "Mother" | "Grandfather" | "Father-in-law" | "Other"
  partNo: string;
  serialNo: string;
  epicNo: string;
  electoralRollYear?: string; // Reference text from certificate source, e.g. "Draft Electoral Roll 2025" or "2029"
  assemblyConstituency?: string;
}

export interface LinkageDetails {
  // Applicant electoral particulars
  voterStatus: "registered" | "unregistered";
  assemblyConstituency: string;
  applicantPartNo: string;
  applicantSerialNo: string;
  applicantEpicNo: string;
  
  // Election-Enrolment Purpose
  purpose: string;
  targetAssemblyConstituency: string;

  // Section C: Repeatable Father / Mother / Ancestor Electoral Records
  parentElectoralRecords: LinkageParentElectoralRecord[];

  // Section D: Marriage / Spouse Information
  spouseName: string;
  spouseRelationWording: string;
  spouseParentInfo: string;
  spouseVillage: string;
  spousePostOffice: string;
  spousePoliceStation: string;
  spousePanchayat: string;
  spouseBlock: string;
}

export const EMPTY_LINKAGE: LinkageDetails = {
  voterStatus: "unregistered",
  assemblyConstituency: "91 - Ranaghat Uttar Purba (SC)",
  applicantPartNo: "",
  applicantSerialNo: "",
  applicantEpicNo: "",
  purpose: "Election enrolment as a beneficiary voter of the Assembly Constituency",
  targetAssemblyConstituency: "91 - Ranaghat Uttar Purba (SC)",
  parentElectoralRecords: [
    {
      name: "",
      relation: "Father",
      partNo: "",
      serialNo: "",
      epicNo: "",
      electoralRollYear: "Draft Electoral Roll 2025",
      assemblyConstituency: "91 - Ranaghat Uttar Purba (SC)",
    },
  ],
  spouseName: "",
  spouseRelationWording: "Wife of",
  spouseParentInfo: "",
  spouseVillage: "",
  spousePostOffice: "",
  spousePoliceStation: "Hanskhali",
  spousePanchayat: "Bagula II",
  spouseBlock: "Hanskhali",
};

export interface Attachments {
  declarationAccepted: boolean;
  notes: string;
  items: { label: string; provided: boolean }[];
}

export const DEFAULT_ATTACHMENTS: Attachments = {
  declarationAccepted: false,
  notes: "",
  items: [
    { label: "Voter ID (EPIC) copy", provided: false },
    { label: "Aadhaar copy (masked)", provided: false },
    { label: "Death certificate / supporting proof", provided: false },
    { label: "Self declaration / affidavit", provided: false },
  ],
};

export interface ApplicationDraft {
  applicant: ApplicantInfo;
  warish: WarishDetails;
  dependent: DependentDetails;
  linkage: LinkageDetails;
  attachments: Attachments;
}

export const EMPTY_DRAFT: ApplicationDraft = {
  applicant: EMPTY_APPLICANT,
  warish: {
    deceasedName: "",
    fatherPrefix: "Late",
    fatherName: "",
    relationToGuardian: "Father",
    permanentAddress: "",
    village: "",
    postOffice: "",
    policeStation: "Hanskhali",
    district: "Nadia",
    pin: "741502",
    dateOfDeath: "",
    placeOfDeath: "",
    causeOfDeath: "",
    ageAtDeath: "",
    applicantRelation: "Son",
    heirs: [{ name: "", relation: "Son", age: "", hasLegalSuccessors: "" }],
    successors: [],
  },
  dependent: {
    applicantIsEmployee: true,
    empName: "",
    empId: "",
    dept: "Indian Railways",
    deptManual: "",
    dependents: [{ relation: "Wife", title: "Smt.", name: "", parentRelType: "S/O", parentName: "" }],
  },
  linkage: EMPTY_LINKAGE,
  attachments: DEFAULT_ATTACHMENTS,
};

export const WIZARD_STEPS = [
  { key: "duplicate", label: "Duplicate", icon: "🔍" },
  { key: "applicant", label: "Applicant", icon: "👤" },
  { key: "details", label: "Certificate Details", icon: "📄" },
  { key: "attachments", label: "Attachments", icon: "📎" },
  { key: "preview", label: "Preview", icon: "👀" },
  { key: "submit", label: "Submit", icon: "📤" },
] as const;

export type WizardStepKey = (typeof WIZARD_STEPS)[number]["key"];

export * from "@/modules/warish/successorModel";
