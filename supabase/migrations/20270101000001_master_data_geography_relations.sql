-- 1. Create Sansad master table
CREATE TABLE IF NOT EXISTS public.master_sansads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create Village <-> Post Office junction table
CREATE TABLE IF NOT EXISTS public.master_village_post_offices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  village_id uuid NOT NULL REFERENCES public.master_villages(id) ON DELETE CASCADE,
  post_office_id uuid NOT NULL REFERENCES public.master_post_offices(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (village_id, post_office_id)
);

-- 3. Create Ward <-> Sansad junction table
CREATE TABLE IF NOT EXISTS public.master_ward_sansads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_id uuid NOT NULL REFERENCES public.master_wards(id) ON DELETE CASCADE,
  sansad_id uuid NOT NULL REFERENCES public.master_sansads(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ward_id, sansad_id)
);

-- 4. Enable RLS
ALTER TABLE public.master_sansads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_village_post_offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_ward_sansads ENABLE ROW LEVEL SECURITY;

-- 5. Set up explicit Grants and Policies
GRANT SELECT ON public.master_sansads TO anon, authenticated;
GRANT ALL ON public.master_sansads TO service_role;
GRANT SELECT ON public.master_village_post_offices TO anon, authenticated;
GRANT ALL ON public.master_village_post_offices TO service_role;
GRANT SELECT ON public.master_ward_sansads TO anon, authenticated;
GRANT ALL ON public.master_ward_sansads TO service_role;

-- We only allow super_admins to edit these relations.
-- Public forms need SELECT access to list them dynamically.
DO $$ BEGIN
  CREATE POLICY "master_sansads_read_all" ON public.master_sansads FOR SELECT USING (true);
  CREATE POLICY "master_sansads_super_admin_write" ON public.master_sansads
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'))
    WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

  CREATE POLICY "master_vpo_read_all" ON public.master_village_post_offices FOR SELECT USING (true);
  CREATE POLICY "master_vpo_super_admin_write" ON public.master_village_post_offices
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'))
    WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

  CREATE POLICY "master_ws_read_all" ON public.master_ward_sansads FOR SELECT USING (true);
  CREATE POLICY "master_ws_super_admin_write" ON public.master_ward_sansads
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'))
    WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. Setup Update Triggers for timestamp
CREATE TRIGGER master_sansads_updated_at BEFORE UPDATE ON public.master_sansads
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER master_vpo_updated_at BEFORE UPDATE ON public.master_village_post_offices
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER master_ws_updated_at BEFORE UPDATE ON public.master_ward_sansads
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 7. Seed baseline Bagula II GP Geography Data (idempotent setup)
DO $$
DECLARE
  v_bagula uuid; v_muragacha uuid; v_sahapur uuid; v_santinagar uuid; v_hatibandha uuid; v_madna uuid;
  po_bagula uuid; po_muragacha uuid; po_haldipara uuid; po_santinagar uuid; po_hatibandha uuid;
BEGIN
  -- Insert/Ensure Villages
  INSERT INTO public.master_villages (name) VALUES
    ('Bagula Station Para'), ('Bagula Puratanpara'), ('Bagula Madhyapara'), ('Bagula College Para'),
    ('Bara Muragacha'), ('Muragacha Colony'), ('Muragacha Colony Madhyapara'), ('Milannagar'),
    ('Sahapur'), ('Hatibandha'), ('Santinagar'), ('Madna')
  ON CONFLICT (name) DO NOTHING;

  -- Insert/Ensure POs
  INSERT INTO public.master_post_offices (name, pin_code) VALUES
    ('Bagula', '741502'), ('Muragacha Colony', '741502'), ('Haldipara', '741502'),
    ('Santinagar', '741502'), ('Hatibandha', '741502')
  ON CONFLICT (name, pin_code) DO NOTHING;

  -- Setup Village-PO junction mapping mimicking legacy VILLAGE_PO_RULES
  -- Resolve IDs:
  SELECT id INTO po_bagula FROM public.master_post_offices WHERE name = 'Bagula';
  SELECT id INTO po_muragacha FROM public.master_post_offices WHERE name = 'Muragacha Colony';
  SELECT id INTO po_haldipara FROM public.master_post_offices WHERE name = 'Haldipara';
  SELECT id INTO po_santinagar FROM public.master_post_offices WHERE name = 'Santinagar';
  SELECT id INTO po_hatibandha FROM public.master_post_offices WHERE name = 'Hatibandha';

  -- Bagula PO Villages
  INSERT INTO public.master_village_post_offices (village_id, post_office_id)
  SELECT id, po_bagula FROM public.master_villages WHERE name IN ('Bagula Station Para', 'Bagula Puratanpara', 'Bagula Madhyapara', 'Bagula College Para')
  ON CONFLICT DO NOTHING;

  -- Muragacha PO Villages
  INSERT INTO public.master_village_post_offices (village_id, post_office_id)
  SELECT id, po_muragacha FROM public.master_villages WHERE name IN ('Bara Muragacha', 'Muragacha Colony', 'Muragacha Colony Madhyapara', 'Milannagar')
  ON CONFLICT DO NOTHING;

  -- Haldipara PO Villages
  INSERT INTO public.master_village_post_offices (village_id, post_office_id)
  SELECT id, po_haldipara FROM public.master_villages WHERE name = 'Sahapur'
  ON CONFLICT DO NOTHING;

  -- Santinagar PO Villages
  INSERT INTO public.master_village_post_offices (village_id, post_office_id)
  SELECT id, po_santinagar FROM public.master_villages WHERE name IN ('Santinagar', 'Hatibandha')
  ON CONFLICT DO NOTHING;

  -- Hatibandha PO Villages
  INSERT INTO public.master_village_post_offices (village_id, post_office_id)
  SELECT id, po_hatibandha FROM public.master_villages WHERE name = 'Madna'
  ON CONFLICT DO NOTHING;

END $$;
