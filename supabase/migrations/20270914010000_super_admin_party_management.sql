-- ============================================================================
-- MIGRATION: 20270914010000_super_admin_party_management.sql
-- Description: Allow Super Admin to change party of elected members
-- and configure party profile colours (BJP=Saffron, TMC=Green, CONG=Blue, CPIM=Red)
-- ============================================================================

-- 1. Ensure master_parties has standardized color codes and party codes
INSERT INTO public.master_parties (party_code, party_name, party_name_bn, symbol_name, color_code, party_logo_url, sort_order)
VALUES
('BJP', 'Bharatiya Janata Party', 'ভারতীয় জনতা পার্টি', 'Lotus (পদ্ম)', '#ea580c', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Bharatiya_Janata_Party_logo.svg/240px-Bharatiya_Janata_Party_logo.svg.png', 1),
('AITC', 'All India Trinamool Congress', 'সর্বভারতীয় তৃণমূল কংগ্রেস', 'Jora Ghas Phul (Twin Flowers)', '#16a34a', 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png', 2),
('INC', 'Indian National Congress', 'ভারতীয় জাতীয় কংগ্রেস', 'Hand (হাত)', '#2563eb', 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Indian_National_Congress_hand_logo.svg/240px-Indian_National_Congress_hand_logo.svg.png', 3),
('CPIM', 'Communist Party of India (Marxist)', 'ভারতের কমিউনিস্ট পার্টি (মার্কসবাদী)', 'Hammer, Sickle and Star (কাস্তে-হাতুড়ি-তারা)', '#dc2626', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Cpi-m-flag.svg/240px-Cpi-m-flag.svg.png', 4),
('IND', 'Independent / Others', 'নির্দলীয় / অন্যান্য', 'Free Symbol (স্বতন্ত্র প্রতীক)', '#475569', '', 5)
ON CONFLICT (party_code) DO UPDATE SET
  party_name = EXCLUDED.party_name,
  party_name_bn = EXCLUDED.party_name_bn,
  symbol_name = EXCLUDED.symbol_name,
  color_code = EXCLUDED.color_code,
  party_logo_url = EXCLUDED.party_logo_url,
  sort_order = EXCLUDED.sort_order;

-- 2. Dedicated RPC for Super Admin to rapidly switch a member's party
CREATE OR REPLACE FUNCTION public.change_elected_member_party(
    _member_id UUID DEFAULT NULL,
    _ward_number INT DEFAULT NULL,
    _party_code TEXT DEFAULT 'AITC'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    _uid UUID := auth.uid();
    _email TEXT;
    _party_row public.master_parties%ROWTYPE;
    _target_id UUID := _member_id;
    _result JSONB;
BEGIN
    IF _uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT lower(email) INTO _email FROM auth.users WHERE id = _uid;

    -- Authorization: Super Admin, Admin, or designated Super Admin email
    IF NOT (
        public.has_role(_uid, 'super_admin') 
        OR public.has_role(_uid, 'admin')
        OR _email = 'bagula2nogp111@gmail.com'
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only Super Admins can alter party affiliations of Elected Representatives';
    END IF;

    -- Lookup Party details by code (normalize BJP, TMC/AITC, CONG/INC, CPIM/CPM, IND)
    SELECT * INTO _party_row FROM public.master_parties
    WHERE UPPER(party_code) = CASE 
        WHEN UPPER(_party_code) IN ('TMC', 'AITC', 'TRINAMOOL') THEN 'AITC'
        WHEN UPPER(_party_code) IN ('BJP', 'BHARATIYA') THEN 'BJP'
        WHEN UPPER(_party_code) IN ('CONG', 'CONGRESS', 'INC') THEN 'INC'
        WHEN UPPER(_party_code) IN ('CPIM', 'CPM', 'MARXIST') THEN 'CPIM'
        ELSE 'IND'
    END
    LIMIT 1;

    IF _party_row.id IS NULL THEN
        RAISE EXCEPTION 'Political party % not recognized', _party_code;
    END IF;

    -- Find target member if _member_id is null or a fallback string
    IF _target_id IS NULL AND _ward_number IS NOT NULL THEN
        SELECT id INTO _target_id FROM public.elected_members WHERE ward_number = _ward_number LIMIT 1;
    END IF;

    IF _target_id IS NOT NULL THEN
        UPDATE public.elected_members SET
            party_id = _party_row.id,
            party_name = _party_row.party_name,
            party_logo_url = _party_row.party_logo_url,
            updated_at = NOW()
        WHERE id = _target_id;
    ELSIF _ward_number IS NOT NULL THEN
        UPDATE public.elected_members SET
            party_id = _party_row.id,
            party_name = _party_row.party_name,
            party_logo_url = _party_row.party_logo_url,
            updated_at = NOW()
        WHERE ward_number = _ward_number;
    ELSE
        RAISE EXCEPTION 'Either member_id or ward_number must be specified';
    END IF;

    -- Return updated info
    SELECT to_jsonb(em.*) INTO _result 
    FROM public.elected_members em 
    WHERE (id = _target_id OR ward_number = _ward_number)
    LIMIT 1;

    RETURN jsonb_build_object(
        'success', true,
        'party_code', _party_row.party_code,
        'party_name', _party_row.party_name,
        'color_code', _party_row.color_code,
        'member', _result
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.change_elected_member_party(UUID, INT, TEXT) TO authenticated;
