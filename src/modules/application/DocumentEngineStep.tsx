import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, FileText, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ApplicationKind } from "./types";
import type { DocumentRequirement, DocumentRecord } from "./documentEngineTypes";
import { toast } from "sonner";

export default function DocumentEngineStep({
  appId,
  kind,
}: {
  appId: string;
  kind: ApplicationKind;
}) {
  const [requirements, setRequirements] = useState<DocumentRequirement[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    loadDocs();
  }, [appId]);

  async function loadDocs() {
    try {
      setLoading(true);
      // Fetch active requirements for this cert_kind
      const { data: reqs, error: reqErr } = await supabase
        .from("master_document_requirements")
        .select(`
          id, cert_kind, document_type_id, requirement_stage, is_mandatory, max_files, allowed_extensions, display_order,
          master_document_types ( type_name )
        `)
        .eq("cert_kind", kind)
        .eq("is_active", true)
        .order("display_order");

      if (reqErr) throw reqErr;

      const mappedReqs = (reqs as any[]).map(r => ({
        ...r,
        label: r.master_document_types?.type_name || "Unknown Document"
      }));
      setRequirements(mappedReqs);

      // Fetch existing documents for this app
      const { data: docs, error: docErr } = await supabase
        .from("documents_engine")
        .select("id, requirement_id, file_path, file_size_bytes, mime_type, is_active, verification_status, created_at")
        .eq("application_id", appId)
        .eq("is_active", true);

      if (docErr) throw docErr;
      setDocuments(docs as DocumentRecord[]);
    } catch (err: any) {
      toast.error(err.message || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }

  const handleUpload = async (file: File, req: DocumentRequirement) => {
    if (!file) return;

    // Validate extension
    const ext = "." + file.name.split('.').pop()?.toLowerCase();
    if (!req.allowed_extensions.includes(ext)) {
      toast.error(`Invalid file type. Allowed: ${req.allowed_extensions.join(", ")}`);
      return;
    }

    // Validate size against Super Admin configured validation logic
    const { getCachedValidationRules } = await import("@/lib/appSettings");
    const valRules = getCachedValidationRules();
    const maxBytes = (valRules.maxGeneralDocSizeKb || 2048) * 1024;
    if (file.size > maxBytes) {
      toast.error(`File size (${(file.size / 1024).toFixed(0)} KB) exceeds maximum allowed limit of ${valRules.maxGeneralDocSizeKb} KB (${(valRules.maxGeneralDocSizeKb / 1024).toFixed(1)} MB)`);
      return;
    }

    try {
      setUploading(req.id);
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user.id;
      if (!uid) throw new Error("Not authenticated");

      const path = `${uid}/${appId}/${req.id}/${Date.now()}${ext}`;

      const { error: upErr } = await supabase.storage
        .from("citizen-documents")
        .upload(path, file);

      if (upErr) throw upErr;

      // Link doc
      const { data: linkData, error: linkErr } = await supabase.rpc("link_document_to_application", {
        _kind: kind,
        _app_id: appId,
        _req_id: req.id,
        _storage_path: path,
        _file_size_bytes: file.size,
        _mime_type: file.type
      });

      if (linkErr) throw linkErr;

      toast.success("Document uploaded successfully");
      loadDocs();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  if (loading) return <Loader2 className="animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">📎 Attachments (Digital)</h2>
        <p className="text-sm text-muted-foreground">
          Upload the required documents for your application.
        </p>
      </div>

      <div className="space-y-4">
        {requirements.map(req => {
          const linkedDocs = documents.filter(d => d.requirement_id === req.id);
          const isFull = linkedDocs.length >= req.max_files;

          return (
            <div key={req.id} className="rounded-md border p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-sm flex items-center gap-2">
                    {req.label}
                    {req.is_mandatory && <span className="text-destructive text-xs font-bold">* Required</span>}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Stage: {req.requirement_stage} | Max: {req.max_files} files | Types: {req.allowed_extensions.join(", ")}
                  </p>
                </div>
                {!isFull && (
                  <div className="relative">
                    <input
                      type="file"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={uploading !== null}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(file, req);
                        e.target.value = '';
                      }}
                    />
                    <Button size="sm" variant="secondary" disabled={uploading === req.id}>
                      {uploading === req.id ? <Loader2 size={14} className="animate-spin mr-2" /> : <Upload size={14} className="mr-2" />}
                      Upload
                    </Button>
                  </div>
                )}
              </div>

              {linkedDocs.length > 0 && (
                <ul className="space-y-2 mt-2">
                  {linkedDocs.map(doc => (
                    <li key={doc.id} className="text-sm flex items-center justify-between bg-muted/50 p-2 rounded border">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-primary" />
                        <span className="truncate max-w-[200px]" title={doc.file_path}>
                          {doc.file_path.split('/').pop()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.verification_status === "verified" && <CheckCircle2 size={14} className="text-green-600" />}
                        {doc.verification_status === "rejected" && <XCircle size={14} className="text-destructive" />}
                        {doc.verification_status === "pending" && <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">Pending Review</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
