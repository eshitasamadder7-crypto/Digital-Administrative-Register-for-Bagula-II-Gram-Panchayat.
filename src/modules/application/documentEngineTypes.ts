export interface DocumentRequirement {
  id: string;
  cert_kind: string;
  document_type_id: string;
  requirement_stage: "PRE_SUBMISSION" | "PRE_APPROVAL";
  is_mandatory: boolean;
  max_files: number;
  allowed_extensions: string[];
  display_order: number;
  label: string; // resolved via join with master_document_types
}

export interface DocumentRecord {
  id: string;
  requirement_id: string;
  file_path: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  is_active: boolean;
  verification_status: "pending" | "verified" | "rejected";
  created_at: string;
}
