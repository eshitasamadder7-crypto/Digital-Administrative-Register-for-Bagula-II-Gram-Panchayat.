import { CERTIFICATE_TYPES, type CertificateKey } from "./certificateRegistry";

/** Placeholder wrapper. Existing warish/dependent generators keep their current code paths. */
export const certificateEngine = {
  get(key: CertificateKey) {
    return CERTIFICATE_TYPES[key];
  },
  isActive(key: CertificateKey) {
    return CERTIFICATE_TYPES[key]?.status === "active";
  },
};