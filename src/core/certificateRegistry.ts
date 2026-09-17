import type { AppStatus } from "./appState";

export type CertificateKey = "WARISH" | "DEPENDENT" | "LINKAGE";

export interface CertificateTypeDef {
  key: CertificateKey;
  displayName: string;
  route: string;
  prefix: string;
  status: "active" | "planned" | "deprecated";
  template: string | null;
  workflow: AppStatus[] | null;
}

const DEFAULT_WORKFLOW: AppStatus[] = [
  "draft",
  "submitted",
  "locked",
  "processing",
  "approved",
  "issued",
];

export const CERTIFICATE_TYPES: Record<CertificateKey, CertificateTypeDef> = {
  WARISH: {
    key: "WARISH",
    displayName: "Warish Certificate",
    route: "/warish-certificate",
    prefix: "WARISH",
    status: "active",
    template: "warish.v1",
    workflow: DEFAULT_WORKFLOW,
  },
  DEPENDENT: {
    key: "DEPENDENT",
    displayName: "Dependent Certificate",
    route: "/dependent-certificate",
    prefix: "DEPENDENT",
    status: "active",
    template: "dependent.v1",
    workflow: DEFAULT_WORKFLOW,
  },
  LINKAGE: {
    key: "LINKAGE",
    displayName: "Family Linkage Certificate",
    route: "/linkage-certificate",
    prefix: "LINKAGE",
    status: "active",
    template: "linkage.v1",
    workflow: DEFAULT_WORKFLOW,
  },
};

export const ACTIVE_CERTIFICATE_TYPES = Object.values(CERTIFICATE_TYPES).filter(
  (t) => t.status === "active",
);