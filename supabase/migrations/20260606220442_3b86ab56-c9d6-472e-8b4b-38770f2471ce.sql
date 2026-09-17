-- Data API grants for public tables used by the app
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.warish_certificates TO authenticated;
GRANT ALL ON public.warish_certificates TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dependent_certificates TO authenticated;
GRANT ALL ON public.dependent_certificates TO service_role;

GRANT SELECT ON public.whats_new_entries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whats_new_entries TO authenticated;
GRANT ALL ON public.whats_new_entries TO service_role;