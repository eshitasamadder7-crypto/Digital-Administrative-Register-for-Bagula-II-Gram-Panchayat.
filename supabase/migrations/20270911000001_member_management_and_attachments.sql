-- ============================================================================
-- MIGRATION: 20270911000001_member_management_and_attachments.sql
-- 1. Create master_parties (Political Parties & Logos)
-- 2. Create master_booths (Polling Booths linked strictly to Wards)
-- 3. Create elected_members (Database-driven Elected Representatives)
-- 4. Create app_attachments (Generic document/media attachments)
-- 5. RPC functions for Super Admin to manage Members, Parties, Booths
-- 6. Seed official 30 Ward Members, Parties, and Booths of Bagula II GP
-- ============================================================================

-- 1. Master Parties
CREATE TABLE IF NOT EXISTS public.master_parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_code TEXT NOT NULL UNIQUE,
    party_name TEXT NOT NULL,
    party_name_bn TEXT,
    party_logo_url TEXT,
    symbol_name TEXT,
    color_code TEXT DEFAULT '#15803d',
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Master Booths
CREATE TABLE IF NOT EXISTS public.master_booths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booth_number INT NOT NULL,
    booth_name TEXT NOT NULL,
    booth_name_bn TEXT,
    ward_number INT NOT NULL,
    village_name TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT master_booths_ward_booth_unique UNIQUE (ward_number, booth_number)
);

CREATE INDEX IF NOT EXISTS idx_master_booths_ward ON public.master_booths(ward_number);

-- 3. Elected Members
CREATE TABLE IF NOT EXISTS public.elected_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_bn TEXT,
    designation TEXT NOT NULL DEFAULT 'Ward Member',
    ward_number INT NOT NULL,
    booth_id UUID REFERENCES public.master_booths(id) ON DELETE SET NULL,
    booth_number INT,
    party_id UUID REFERENCES public.master_parties(id) ON DELETE SET NULL,
    party_name TEXT,
    party_logo_url TEXT,
    village TEXT,
    phone TEXT,
    email TEXT,
    photo_url TEXT,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT elected_members_ward_unique UNIQUE (ward_number)
);

CREATE INDEX IF NOT EXISTS idx_elected_members_ward ON public.elected_members(ward_number);
CREATE INDEX IF NOT EXISTS idx_elected_members_party ON public.elected_members(party_id);

-- 4. App Attachments (Generic storage for SOPs, services, members, notices)
CREATE TABLE IF NOT EXISTS public.app_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_entity TEXT NOT NULL, -- 'sop', 'sop_step', 'service', 'notice', 'member', 'master_data'
    parent_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    description TEXT,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_public BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_attachments_parent ON public.app_attachments(parent_entity, parent_id);

-- RLS
ALTER TABLE public.master_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_booths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elected_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_attachments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- master_parties
  DROP POLICY IF EXISTS "master_parties_read_all" ON public.master_parties;
  CREATE POLICY "master_parties_read_all" ON public.master_parties FOR SELECT USING (true);

  DROP POLICY IF EXISTS "master_parties_admin_write" ON public.master_parties;
  CREATE POLICY "master_parties_admin_write" ON public.master_parties FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

  -- master_booths
  DROP POLICY IF EXISTS "master_booths_read_all" ON public.master_booths;
  CREATE POLICY "master_booths_read_all" ON public.master_booths FOR SELECT USING (true);

  DROP POLICY IF EXISTS "master_booths_admin_write" ON public.master_booths;
  CREATE POLICY "master_booths_admin_write" ON public.master_booths FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

  -- elected_members
  DROP POLICY IF EXISTS "elected_members_read_all" ON public.elected_members;
  CREATE POLICY "elected_members_read_all" ON public.elected_members FOR SELECT USING (true);

  DROP POLICY IF EXISTS "elected_members_admin_write" ON public.elected_members;
  CREATE POLICY "elected_members_admin_write" ON public.elected_members FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

  -- app_attachments
  DROP POLICY IF EXISTS "app_attachments_read_all" ON public.app_attachments;
  CREATE POLICY "app_attachments_read_all" ON public.app_attachments FOR SELECT
    USING (is_public = true OR (auth.uid() IS NOT NULL AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))));

  DROP POLICY IF EXISTS "app_attachments_admin_write" ON public.app_attachments;
  CREATE POLICY "app_attachments_admin_write" ON public.app_attachments FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
EXCEPTION WHEN OTHERS THEN NULL; END $$;

GRANT SELECT ON public.master_parties TO anon, authenticated;
GRANT ALL ON public.master_parties TO authenticated, service_role;

GRANT SELECT ON public.master_booths TO anon, authenticated;
GRANT ALL ON public.master_booths TO authenticated, service_role;

GRANT SELECT ON public.elected_members TO anon, authenticated;
GRANT ALL ON public.elected_members TO authenticated, service_role;

GRANT SELECT ON public.app_attachments TO anon, authenticated;
GRANT ALL ON public.app_attachments TO authenticated, service_role;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS master_parties_updated_at ON public.master_parties;
CREATE TRIGGER master_parties_updated_at BEFORE UPDATE ON public.master_parties FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS master_booths_updated_at ON public.master_booths;
CREATE TRIGGER master_booths_updated_at BEFORE UPDATE ON public.master_booths FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS elected_members_updated_at ON public.elected_members;
CREATE TRIGGER elected_members_updated_at BEFORE UPDATE ON public.elected_members FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS app_attachments_updated_at ON public.app_attachments;
CREATE TRIGGER app_attachments_updated_at BEFORE UPDATE ON public.app_attachments FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


-- 5. RPC Functions
CREATE OR REPLACE FUNCTION public.save_elected_member(
    _member_id UUID,
    _payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    _uid UUID := auth.uid();
    _row public.elected_members%ROWTYPE;
    _ward_num INT;
    _booth_num INT := NULL;
    _booth_id UUID := NULL;
    _party_id UUID := NULL;
    _party_name TEXT := NULL;
    _party_logo TEXT := NULL;
    _party_row public.master_parties%ROWTYPE;
    _booth_row public.master_booths%ROWTYPE;
BEGIN
    IF _uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF NOT (public.has_role(_uid, 'admin') OR public.has_role(_uid, 'super_admin')) THEN
        RAISE EXCEPTION 'Unauthorized: Only Admins can modify Elected Representatives';
    END IF;

    _ward_num := (_payload->>'ward_number')::int;
    IF _ward_num IS NULL OR _ward_num < 1 OR _ward_num > 50 THEN
        RAISE EXCEPTION 'Invalid ward number: %', _ward_num;
    END IF;

    -- Validate Booth and ensure Booth belongs strictly to the selected Ward
    IF _payload ? 'booth_number' AND _payload->>'booth_number' IS NOT NULL AND (_payload->>'booth_number') <> '' THEN
        _booth_num := (_payload->>'booth_number')::int;
        SELECT * INTO _booth_row FROM public.master_booths
        WHERE ward_number = _ward_num AND booth_number = _booth_num
        LIMIT 1;

        IF _booth_row.id IS NOT NULL THEN
            _booth_id := _booth_row.id;
        END IF;
    ELSIF _payload ? 'booth_id' AND _payload->>'booth_id' IS NOT NULL AND (_payload->>'booth_id') <> '' THEN
        _booth_id := (_payload->>'booth_id')::uuid;
        SELECT * INTO _booth_row FROM public.master_booths
        WHERE id = _booth_id AND ward_number = _ward_num;

        IF _booth_row.id IS NULL THEN
            RAISE EXCEPTION 'Booth % does not belong to Ward %', _booth_id, _ward_num;
        END IF;
        _booth_num := _booth_row.booth_number;
    END IF;

    -- Link Party & Party Logo
    IF _payload ? 'party_id' AND _payload->>'party_id' IS NOT NULL AND (_payload->>'party_id') <> '' THEN
        _party_id := (_payload->>'party_id')::uuid;
        SELECT * INTO _party_row FROM public.master_parties WHERE id = _party_id;
        IF _party_row.id IS NOT NULL THEN
            _party_name := _party_row.party_name;
            _party_logo := _party_row.party_logo_url;
        END IF;
    END IF;

    IF _party_name IS NULL AND _payload ? 'party_name' THEN
        _party_name := _payload->>'party_name';
    END IF;
    IF _party_logo IS NULL AND _payload ? 'party_logo_url' THEN
        _party_logo := _payload->>'party_logo_url';
    END IF;

    IF _member_id IS NOT NULL THEN
        UPDATE public.elected_members SET
            name = COALESCE(_payload->>'name', name),
            name_bn = _payload->>'name_bn',
            designation = COALESCE(_payload->>'designation', designation),
            ward_number = _ward_num,
            booth_id = _booth_id,
            booth_number = _booth_num,
            party_id = _party_id,
            party_name = _party_name,
            party_logo_url = _party_logo,
            village = _payload->>'village',
            phone = _payload->>'phone',
            email = _payload->>'email',
            photo_url = _payload->>'photo_url',
            display_order = COALESCE((_payload->>'display_order')::int, display_order),
            is_active = COALESCE((_payload->>'is_active')::boolean, is_active),
            updated_at = NOW()
        WHERE id = _member_id
        RETURNING * INTO _row;
    ELSE
        INSERT INTO public.elected_members (
            name, name_bn, designation, ward_number, booth_id, booth_number,
            party_id, party_name, party_logo_url, village, phone, email, photo_url,
            display_order, is_active
        ) VALUES (
            _payload->>'name',
            _payload->>'name_bn',
            COALESCE(_payload->>'designation', 'Ward Member'),
            _ward_num,
            _booth_id,
            _booth_num,
            _party_id,
            _party_name,
            _party_logo,
            _payload->>'village',
            _payload->>'phone',
            _payload->>'email',
            _payload->>'photo_url',
            COALESCE((_payload->>'display_order')::int, _ward_num),
            COALESCE((_payload->>'is_active')::boolean, true)
        )
        ON CONFLICT (ward_number) DO UPDATE SET
            name = EXCLUDED.name,
            name_bn = EXCLUDED.name_bn,
            designation = EXCLUDED.designation,
            booth_id = EXCLUDED.booth_id,
            booth_number = EXCLUDED.booth_number,
            party_id = EXCLUDED.party_id,
            party_name = EXCLUDED.party_name,
            party_logo_url = EXCLUDED.party_logo_url,
            village = EXCLUDED.village,
            phone = EXCLUDED.phone,
            email = EXCLUDED.email,
            photo_url = EXCLUDED.photo_url,
            display_order = EXCLUDED.display_order,
            is_active = EXCLUDED.is_active,
            updated_at = NOW()
        RETURNING * INTO _row;
    END IF;

    -- Audit log
    INSERT INTO public.activity_logs (
        actor_user_id, actor_email, action_type, target_table, target_id, metadata
    ) VALUES (
        _uid, (SELECT email FROM auth.users WHERE id = _uid),
        'elected_members.save', 'elected_members', _row.id::text,
        jsonb_build_object('ward', _row.ward_number, 'name', _row.name, 'designation', _row.designation)
    );

    RETURN to_jsonb(_row);
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_elected_member(UUID, JSONB) TO authenticated;


-- 6. Initial Seeds for Master Parties
INSERT INTO public.master_parties (party_code, party_name, party_name_bn, symbol_name, color_code, party_logo_url, sort_order)
VALUES
('AITC', 'All India Trinamool Congress', 'সর্বভারতীয় তৃণমূল কংগ্রেস', 'Jora Ghas Phul (Twin Flowers)', '#16a34a', 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png', 1),
('BJP', 'Bharatiya Janata Party', 'ভারতীয় জনতা পার্টি', 'Lotus (পদ্ম)', '#ea580c', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Bharatiya_Janata_Party_logo.svg/240px-Bharatiya_Janata_Party_logo.svg.png', 2),
('CPIM', 'Communist Party of India (Marxist)', 'ভারতের কমিউনিস্ট পার্টি (মার্কসবাদী)', 'Hammer, Sickle and Star (কাস্তে-হাতুড়ি-তারা)', '#dc2626', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Cpi-m-flag.svg/240px-Cpi-m-flag.svg.png', 3),
('INC', 'Indian National Congress', 'ভারতীয় জাতীয় কংগ্রেস', 'Hand (হাত)', '#2563eb', 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Indian_National_Congress_hand_logo.svg/240px-Indian_National_Congress_hand_logo.svg.png', 4),
('IND', 'Independent / Niradolos', 'নির্দলীয়', 'Free Symbol', '#475569', '', 5)
ON CONFLICT (party_code) DO UPDATE SET
  party_name = EXCLUDED.party_name,
  party_name_bn = EXCLUDED.party_name_bn,
  party_logo_url = EXCLUDED.party_logo_url;

-- 7. Initial Seeds for Master Booths across Wards 1-30
INSERT INTO public.master_booths (ward_number, booth_number, booth_name, booth_name_bn, village_name, sort_order)
VALUES
(1, 101, 'Bagula Station Para Free Primary School - Room 1', 'বগুলা স্টেশনপাড়া অবৈতনিক প্রাথমিক বিদ্যালয় - কক্ষ ১', 'Bagula Station Para', 1),
(2, 102, 'Bagula Station Para Free Primary School - Room 2', 'বগুলা স্টেশনপাড়া অবৈতনিক প্রাথমিক বিদ্যালয় - কক্ষ ২', 'Bagula Station Para', 2),
(3, 103, 'Bagula Puratanpara Primary School - Room 1', 'বগুলা পুরাতনপাড়া প্রাথমিক বিদ্যালয় - কক্ষ ১', 'Bagula Puratanpara', 3),
(4, 104, 'Bagula Puratanpara Primary School - Room 2', 'বগুলা পুরাতনপাড়া প্রাথমিক বিদ্যালয় - কক্ষ ২', 'Bagula Puratanpara', 4),
(5, 105, 'Bagula Madhyapara High School - Room 1', 'বগুলা মধ্যপাড়া উচ্চ বিদ্যালয় - কক্ষ ১', 'Bagula Madhyapara', 5),
(6, 106, 'Bagula Madhyapara High School - Room 2', 'বগুলা মধ্যপাড়া উচ্চ বিদ্যালয় - কক্ষ ২', 'Bagula Madhyapara', 6),
(7, 107, 'Bagula College Para Community Hall', 'বগুলা কলেজপাড়া কমিউনিটি হল', 'Bagula College Para', 7),
(8, 108, 'Sri Krishna College Main Building - Room 101', 'শ্রীকৃষ্ণ কলেজ মূল ভবন - কক্ষ ১০১', 'Bagula College Para', 8),
(9, 109, 'Bara Muragacha Primary School - Room 1', 'বড় মুড়াগাছা প্রাথমিক বিদ্যালয় - কক্ষ ১', 'Bara Muragacha', 9),
(10, 110, 'Bara Muragacha Primary School - Room 2', 'বড় মুড়াগাছা প্রাথমিক বিদ্যালয় - কক্ষ ২', 'Bara Muragacha', 10),
(11, 111, 'Bagula II Gram Panchayat Office Building', 'বগুলা ২ নং গ্রাম পঞ্চায়েত কার্যালয় ভবন', 'Bara Muragacha', 11),
(12, 112, 'Muragacha Colony Girls High School', 'মুড়াগাছা কলোনি বালিকা বিদ্যালয়', 'Muragacha Colony', 12),
(13, 113, 'Muragacha Colony Primary School - Room 1', 'মুড়াগাছা কলোনি প্রাথমিক বিদ্যালয় - কক্ষ ১', 'Muragacha Colony', 13),
(14, 114, 'Muragacha Colony Madhyapara Primary School', 'মুড়াগাছা কলোনি মধ্যপাড়া প্রাথমিক বিদ্যালয়', 'Muragacha Colony Madhyapara', 14),
(15, 115, 'Muragacha Colony Madhyapara Anganwadi Centre', 'মুড়াগাছা কলোনি মধ্যপাড়া অঙ্গনওয়াড়ি কেন্দ্র', 'Muragacha Colony Madhyapara', 15),
(16, 116, 'Milannagar Primary School - Room 1', 'মিলননগর প্রাথমিক বিদ্যালয় - কক্ষ ১', 'Milannagar', 16),
(17, 117, 'Milannagar Sishu Siksha Kendra', 'মিলননগর শিশু শিক্ষা কেন্দ্র', 'Milannagar', 17),
(18, 118, 'Sahapur Primary School - Room 1', 'সাহাপুর প্রাথমিক বিদ্যালয় - কক্ষ ১', 'Sahapur', 18),
(19, 119, 'Sahapur Free Primary School - Room 2', 'সাহাপুর অবৈতনিক প্রাথমিক বিদ্যালয় - কক্ষ ২', 'Sahapur', 19),
(20, 120, 'Hatibandha Primary School - Room 1', 'হাতিবান্ধা প্রাথমিক বিদ্যালয় - কক্ষ ১', 'Hatibandha', 20),
(21, 121, 'Hatibandha Junior High School', 'হাতিবান্ধা জুনিয়র হাই স্কুল', 'Hatibandha', 21),
(22, 122, 'Santinagar Primary School - Room 1', 'শান্তিনগর প্রাথমিক বিদ্যালয় - কক্ষ ১', 'Santinagar', 22),
(23, 123, 'Santinagar High School - Room 1', 'শান্তিনগর হাই স্কুল - কক্ষ ১', 'Santinagar', 23),
(24, 124, 'Santinagar High School - Room 2', 'শান্তিনগর হাই স্কুল - কক্ষ ২', 'Santinagar', 24),
(25, 125, 'Madna Primary School - Room 1', 'মাদনা প্রাথমিক বিদ্যালয় - কক্ষ ১', 'Madna', 25),
(26, 126, 'Madna Primary School - Room 2', 'মাদনা প্রাথমিক বিদ্যালয় - কক্ষ ২', 'Madna', 26),
(27, 127, 'Madna Sishu Siksha Kendra', 'মাদনা শিশু শিক্ষা কেন্দ্র', 'Madna', 27),
(28, 128, 'Madna Uttarpara Anganwadi Centre', 'মাদনা উত্তরপাড়া অঙ্গনওয়াড়ি কেন্দ্র', 'Madna', 28),
(29, 129, 'Madna Dakshinpara Primary School', 'মাদনা দক্ষিণপাড়া প্রাথমিক বিদ্যালয়', 'Madna', 29),
(30, 130, 'Bara Muragacha Milan Sangha Hall', 'বড় মুড়াগাছা মিলন সংঘ হল', 'Bara Muragacha', 30)
ON CONFLICT (ward_number, booth_number) DO UPDATE SET
  booth_name = EXCLUDED.booth_name,
  booth_name_bn = EXCLUDED.booth_name_bn;

-- 8. Seed 30 Ward Members of Bagula II GP linked to Booths and Parties
DO $$
DECLARE
  v_aitc_id UUID;
  v_bjp_id UUID;
  v_cpim_id UUID;
BEGIN
  SELECT id INTO v_aitc_id FROM public.master_parties WHERE party_code = 'AITC';
  SELECT id INTO v_bjp_id FROM public.master_parties WHERE party_code = 'BJP';
  SELECT id INTO v_cpim_id FROM public.master_parties WHERE party_code = 'CPIM';

  INSERT INTO public.elected_members (ward_number, name, name_bn, designation, village, booth_number, party_id, display_order)
  VALUES
  (1, 'NANDINI BISWAS', 'নন্দিনী বিশ্বাস', 'Ward Member', 'Bagula Station Para', 101, v_aitc_id, 1),
  (2, 'KUSUM BAIRAGI', 'কুসুম বৈরাগী', 'Ward Member', 'Bagula Station Para', 102, v_aitc_id, 2),
  (3, 'ITI BISWAS SANNYASI', 'ইতি বিশ্বাস সন্ন্যাসী', 'Ward Member', 'Bagula Puratanpara', 103, v_aitc_id, 3),
  (4, 'SUPRIYA BISWAS', 'সুপ্রিয়া বিশ্বাস', 'Ward Member', 'Bagula Puratanpara', 104, v_aitc_id, 4),
  (5, 'UJJAL BISWAS', 'উজ্জ্বল বিশ্বাস', 'Ward Member', 'Bagula Madhyapara', 105, v_aitc_id, 5),
  (6, 'SABITA BISWAS DAS', 'সবিতা বিশ্বাস দাস', 'Ward Member', 'Bagula Madhyapara', 106, v_aitc_id, 6),
  (7, 'NIBADITA DUTTA ROY', 'নিবেদিতা দত্ত রায়', 'Ward Member', 'Bagula College Para', 107, v_aitc_id, 7),
  (8, 'AKHIL KUMAR BISWAS', 'অখিল কুমার বিশ্বাস', 'Ward Member', 'Bagula College Para', 108, v_aitc_id, 8),
  (9, 'SIMA TIKADAR', 'সীমা টিকাদার', 'Ward Member', 'Bara Muragacha', 109, v_aitc_id, 9),
  (10, 'KOUSHALLYA MRIDHA', 'কৌশল্যা মৃধা', 'Ward Member', 'Bara Muragacha', 110, v_aitc_id, 10),
  (11, 'SUSMITA BISWAS BARMAN', 'সুস্মিতা বিশ্বাস বর্মন', 'Prodhan', 'Bara Muragacha', 111, v_aitc_id, 11),
  (12, 'BANDANA BARMAN', 'বন্দনা বর্মন', 'Ward Member', 'Muragacha Colony', 112, v_aitc_id, 12),
  (13, 'GOBINDA GHOSH', 'গোবিন্দ ঘোষ', 'Ward Member', 'Muragacha Colony', 113, v_aitc_id, 13),
  (14, 'GAUTAM BISWAS', 'গৌতম বিশ্বাস', 'Ward Member', 'Muragacha Colony Madhyapara', 114, v_aitc_id, 14),
  (15, 'TANUSHREE BISWAS', 'তনুশ্রী বিশ্বাস', 'Ward Member', 'Muragacha Colony Madhyapara', 115, v_aitc_id, 15),
  (16, 'RABINDRA NATH GHOSH', 'রবীন্দ্র নাথ ঘোষ', 'Ward Member', 'Milannagar', 116, v_aitc_id, 16),
  (17, 'ITI MAJUMDER', 'ইতি মজুমদার', 'Ward Member', 'Milannagar', 117, v_aitc_id, 17),
  (18, 'SUKHEN MONDAL', 'সুখেন মণ্ডল', 'Ward Member', 'Sahapur', 118, v_aitc_id, 18),
  (19, 'CHANI BISWAS', 'চানি বিশ্বাস', 'Ward Member', 'Sahapur', 119, v_aitc_id, 19),
  (20, 'RANI DUTTA', 'রাণী দত্ত', 'Ward Member', 'Hatibandha', 120, v_aitc_id, 20),
  (21, 'SOMA BISWAS', 'সোমা বিশ্বাস', 'Ward Member', 'Hatibandha', 121, v_aitc_id, 21),
  (22, 'RAKESH BISWAS', 'রাকেশ বিশ্বাস', 'Ward Member', 'Santinagar', 122, v_aitc_id, 22),
  (23, 'KANAK BISWAS', 'কনক বিশ্বাস', 'Ward Member', 'Santinagar', 123, v_aitc_id, 23),
  (24, 'SUJOY BISWAS', 'সুজয় বিশ্বাস', 'Ward Member', 'Santinagar', 124, v_aitc_id, 24),
  (25, 'CHAMPA SIKDER', 'চম্পা শিকদার', 'Ward Member', 'Madna', 125, v_aitc_id, 25),
  (26, 'SWAPAN KUMAR SARKAR', 'স্বপন কুমার সরকার', 'Ward Member', 'Madna', 126, v_aitc_id, 26),
  (27, 'APARNA PODDAR', 'অপর্ণা পোদ্দার', 'Ward Member', 'Madna', 127, v_aitc_id, 27),
  (28, 'SHARAT MINJI', 'শরৎ মিঞ্জি', 'Ward Member', 'Madna', 128, v_aitc_id, 28),
  (29, 'FIROJ MANDAL', 'ফিরোজ মণ্ডল', 'Ward Member', 'Madna', 129, v_aitc_id, 29),
  (30, 'MANORANJAN BHOWMICK', 'মনোরঞ্জন ভৌমিক', 'Upa-Prodhan', 'Bara Muragacha', 130, v_aitc_id, 30)
  ON CONFLICT (ward_number) DO UPDATE SET
    name = EXCLUDED.name,
    name_bn = EXCLUDED.name_bn,
    designation = EXCLUDED.designation,
    village = EXCLUDED.village,
    booth_number = EXCLUDED.booth_number,
    party_id = EXCLUDED.party_id,
    display_order = EXCLUDED.display_order;

  -- Update booth_id reference from master_booths
  UPDATE public.elected_members em
  SET booth_id = mb.id,
      party_name = mp.party_name,
      party_logo_url = mp.party_logo_url
  FROM public.master_booths mb, public.master_parties mp
  WHERE em.ward_number = mb.ward_number
    AND em.booth_number = mb.booth_number
    AND em.party_id = mp.id;

END $$;
