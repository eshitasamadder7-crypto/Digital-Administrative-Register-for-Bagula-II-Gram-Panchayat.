BEGIN;

SELECT plan(3);

-- Setup fake table triggers just to pass tests offline if pgTAP is run.
-- Usually these are run in the Supabase CI or test runner.

-- Test 1: Insert valid relationship
SELECT lives_ok(
  $$
    INSERT INTO public.warish_certificates(memo_no, cert_date, deceased_name, applicant_name, village, data)
    VALUES (
      'MEMO1',
      '2026-01-01',
      'Dec',
      'App',
      'Bagula Station Para',
      '{"village": "Bagula Station Para", "postOffice": "Bagula"}'::jsonb
    );
  $$,
  'Valid Village and Post Office should pass trigger validation'
);

-- Test 2: Insert invalid relationship
SELECT throws_ok(
  $$
    INSERT INTO public.warish_certificates(memo_no, cert_date, deceased_name, applicant_name, village, data)
    VALUES (
      'MEMO2',
      '2026-01-01',
      'Dec',
      'App',
      'Bagula Station Para',
      '{"village": "Bagula Station Para", "postOffice": "Hatibandha"}'::jsonb
    );
  $$,
  '%Invalid Geography Relationship%',
  'Mismatched Village and Post Office should throw exception'
);

-- Test 3: Unmodified Geography on UPDATE allows changes to other fields for historical consistency
INSERT INTO public.warish_certificates(id, memo_no, cert_date, deceased_name, applicant_name, village, data)
VALUES (
  '123e4567-e89b-12d3-a456-426614174000',
  'MEMO3',
  '2026-01-01',
  'Dec',
  'App',
  'Other',
  '{"village": "Other", "postOffice": "Other", "notes": "initial"}'::jsonb
);

SELECT lives_ok(
  $$
    UPDATE public.warish_certificates
    SET status = 'Approved'
    WHERE id = '123e4567-e89b-12d3-a456-426614174000';
  $$,
  'Updating a record should not trigger geography validation if village and post office are unmodified'
);

SELECT * FROM finish();

ROLLBACK;
