
-- certificates bucket: admins read + write; super_admin full
CREATE POLICY "certs read for admins" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'certificates'
         AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')));

CREATE POLICY "certs upload for admins" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'certificates'
              AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')));

CREATE POLICY "certs update for admins" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'certificates'
         AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')))
  WITH CHECK (bucket_id = 'certificates'
              AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')));

CREATE POLICY "certs delete super admin only" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'certificates' AND public.has_role(auth.uid(),'super_admin'));

-- backups bucket: super admin only
CREATE POLICY "backups super admin select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'certificate-backups' AND public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "backups super admin insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'certificate-backups' AND public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "backups super admin update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'certificate-backups' AND public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (bucket_id = 'certificate-backups' AND public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "backups super admin delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'certificate-backups' AND public.has_role(auth.uid(),'super_admin'));
