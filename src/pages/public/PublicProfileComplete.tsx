import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCitizenSession } from "@/modules/citizen/useCitizenSession";
import { logCitizenActivity } from "@/modules/citizen/citizenAudit";
import { toast } from "@/hooks/use-toast";
import { BackButton } from "@/components/BackButton";

/** Passport photo + Voter ID upload. Required within 30 days of registration. */
export default function PublicProfileComplete() {
  const { session, profile, refresh, graceDaysLeft, applicationsBlocked } = useCitizenSession();
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [epicDoc, setEpicDoc] = useState<File | null>(null);
  const navigate = useNavigate();

  const upload = async (file: File, kind: string) => {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${session!.user.id}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("citizen-documents").upload(path, file, { upsert: true });
    if (error) throw new Error(error.message);
    return path;
  };

  const save = async () => {
    if (!photo && !epicDoc) {
      toast({ title: "Please choose a file to upload", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const patch: { photo_path?: string; epic_doc_path?: string } = {};
      if (photo) patch.photo_path = await upload(photo, "photo");
      if (epicDoc) patch.epic_doc_path = await upload(epicDoc, "epic");
      const { error } = await supabase.from("citizen_profiles").update(patch).eq("user_id", session!.user.id);
      if (error) throw new Error(error.message);
      await logCitizenActivity({
        action_type: "citizen_documents_uploaded",
        citizen_id: profile?.citizen_id,
        metadata: { fields: Object.keys(patch) },
      });
      await refresh();
      toast({ title: "Saved", description: "ধন্যবাদ — আপনার নথি সংরক্ষিত হয়েছে।" });
      navigate("/public/dashboard");
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
      <Helmet>
        <title>Complete Your Profile — Bagula II Gram Panchayat</title>
        <meta name="description" content="Upload your passport photograph and Voter ID to complete your citizen profile." />
      </Helmet>

      <BackButton fallbackUrl="/public/dashboard" label="Back to Dashboard" className="-ml-2" />

      <h1 className="text-2xl font-bold">Complete Your Profile</h1>
      <p className="text-sm text-muted-foreground">
        প্রোফাইল সম্পূর্ণ করুন — passport photograph and Voter ID are required.
      </p>

      <div className={`rounded-lg border px-3 py-2 text-xs ${applicationsBlocked ? "border-destructive text-destructive" : "bg-muted/50 text-muted-foreground"}`}>
        {applicationsBlocked
          ? "New applications are paused until your passport photograph is uploaded."
          : `You have ${graceDaysLeft} day(s) left to upload your passport photograph.`}
      </div>

      <Card className="p-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="cz-photo" className="text-xs">Passport-size photograph <span className="text-destructive">*</span></Label>
          <Input id="cz-photo" type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
          {profile?.photo_path && <p className="text-[11px] text-muted-foreground">A photograph is already on file — uploading replaces it.</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cz-epic" className="text-xs">Voter ID (EPIC) copy</Label>
          <Input id="cz-epic" type="file" accept="image/*,application/pdf" onChange={(e) => setEpicDoc(e.target.files?.[0] ?? null)} />
        </div>
        <Button onClick={save} disabled={busy} className="w-full">
          {busy ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Upload size={16} className="mr-2" />}
          Save documents
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Your documents are stored privately and are visible only to you and the Panchayat office.
        </p>
      </Card>
    </div>
  );
}
