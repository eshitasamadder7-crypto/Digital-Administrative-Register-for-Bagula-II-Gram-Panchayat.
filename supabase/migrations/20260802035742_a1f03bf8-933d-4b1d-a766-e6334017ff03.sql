CREATE POLICY citizen_docs_self_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'citizen-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY citizen_docs_self_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'citizen-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY citizen_docs_self_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'citizen-documents' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'citizen-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY citizen_docs_self_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'citizen-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY citizen_docs_admin_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'citizen-documents' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')));