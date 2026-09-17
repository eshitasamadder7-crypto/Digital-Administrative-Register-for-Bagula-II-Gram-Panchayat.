import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { DocumentRecord } from "@/modules/application/documentEngineTypes";

export default function AdminDocumentList({ appId }: { appId: string }) {
  const [docs, setDocs] = useState<(DocumentRecord & { label?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [appId]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("documents_engine")
      .select(`
        id, requirement_id, file_path, verification_status, is_active, created_at,
        master_document_requirements (
          master_document_types ( type_name )
        )
      `)
      .eq("application_id", appId)
      .eq("is_active", true);

    if (error) {
      toast.error(error.message);
    } else {
      setDocs(data.map((d: any) => ({
        ...d,
        label: d.master_document_requirements?.master_document_types?.type_name || "Document"
      })));
    }
    setLoading(false);
  }

  async function openDoc(path: string) {
    const { data, error } = await supabase.storage.from("citizen-documents").createSignedUrl(path, 60);
    if (error) toast.error("Failed to generate link");
    else if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  async function verifyDoc(id: string, status: "verified" | "rejected") {
    const { error } = await supabase.rpc("verify_application_document", {
      _doc_id: id,
      _status: status
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Document updated");
      load();
    }
  }

  if (loading) return <Loader2 className="animate-spin" />;
  if (docs.length === 0) return <div className="text-muted-foreground">No digital documents linked via the document engine.</div>;

  return (
    <div className="space-y-3">
      {docs.map(d => (
        <div key={d.id} className="border p-3 rounded-md flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-muted/30">
          <div>
            <div className="font-semibold text-sm">{d.label}</div>
            <div className="text-xs text-muted-foreground">Status: <span className="font-medium">{d.verification_status}</span></div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => openDoc(d.file_path)}>
              <ExternalLink size={14} className="mr-2" /> View
            </Button>
            <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => verifyDoc(d.id, "verified")}>
              Verify
            </Button>
            <Button size="sm" variant="destructive" onClick={() => verifyDoc(d.id, "rejected")}>
              Reject
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
