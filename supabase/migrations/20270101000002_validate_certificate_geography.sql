-- Validation trigger to ensure inserted applications use valid Geography mapping

CREATE OR REPLACE FUNCTION public.tg_validate_certificate_geography()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_village text;
  v_post_office text;
  v_valid boolean;
BEGIN
  -- Extract values from JSONB payload
  v_village := NEW.data->>'village';
  v_post_office := NEW.data->>'postOffice';

  -- If neither village nor post office are present or changed during an update, let it pass (Historical integrity)
  IF TG_OP = 'UPDATE' THEN
    IF (OLD.data->>'village' IS NOT DISTINCT FROM v_village) AND (OLD.data->>'postOffice' IS NOT DISTINCT FROM v_post_office) THEN
      RETURN NEW;
    END IF;
  END IF;

  -- "Other" is a manual override, handled dynamically or passed through, skipping strict ID check here.
  IF v_village = 'Other' OR v_post_office = 'Other' THEN
    RETURN NEW;
  END IF;

  IF v_village IS NOT NULL AND v_village != '' AND v_post_office IS NOT NULL AND v_post_office != '' THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.master_village_post_offices vpo
      JOIN public.master_villages v ON v.id = vpo.village_id
      JOIN public.master_post_offices po ON po.id = vpo.post_office_id
      WHERE v.name = v_village
        AND po.name = v_post_office
        AND vpo.is_active = true
    ) INTO v_valid;

    IF NOT v_valid THEN
      RAISE EXCEPTION 'Invalid Geography Relationship: Post Office "%" is not linked to Village "%"', v_post_office, v_village;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Apply to Warish Certificates
DROP TRIGGER IF EXISTS trg_validate_warish_geography ON public.warish_certificates;
CREATE TRIGGER trg_validate_warish_geography
  BEFORE INSERT OR UPDATE ON public.warish_certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_validate_certificate_geography();

-- Apply to Dependent Certificates (if applicable via same schema)
DROP TRIGGER IF EXISTS trg_validate_dependent_geography ON public.dependent_certificates;
CREATE TRIGGER trg_validate_dependent_geography
  BEFORE INSERT OR UPDATE ON public.dependent_certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_validate_certificate_geography();
