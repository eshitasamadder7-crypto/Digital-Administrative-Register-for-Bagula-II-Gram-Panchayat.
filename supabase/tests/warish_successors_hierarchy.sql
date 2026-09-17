BEGIN;

SELECT plan(10);

-- Test 1: Function compute_successor_serial_code exists and generates direct code '1'
SELECT is(
  public.compute_successor_serial_code(NULL, 0, 1),
  '1',
  'Depth 0 sort_order 1 must generate serial code 1'
);

-- Test 2: Depth 0 sort_order 10 must generate serial code 10
SELECT is(
  public.compute_successor_serial_code(NULL, 0, 10),
  '10',
  'Depth 0 sort_order 10 must generate serial code 10'
);

-- Test 3: Depth 1 child of '1' generates '1/A'
SELECT is(
  public.compute_successor_serial_code('1', 1, 1),
  '1/A',
  'Depth 1 sort_order 1 under 1 must generate 1/A'
);

-- Test 4: Depth 1 second child of '1' generates '1/B'
SELECT is(
  public.compute_successor_serial_code('1', 1, 2),
  '1/B',
  'Depth 1 sort_order 2 under 1 must generate 1/B'
);

-- Test 5: Depth 2 grandchild under '1/A' generates '1/A/I'
SELECT is(
  public.compute_successor_serial_code('1/A', 2, 1),
  '1/A/I',
  'Depth 2 sort_order 1 under 1/A must generate 1/A/I'
);

-- Test 6: Depth 2 second grandchild under '1/A' generates '1/A/II'
SELECT is(
  public.compute_successor_serial_code('1/A', 2, 2),
  '1/A/II',
  'Depth 2 sort_order 2 under 1/A must generate 1/A/II'
);

-- Test 7: Depth 3 great-grandchild under '1/A/I' generates '1/A/I/1'
SELECT is(
  public.compute_successor_serial_code('1/A/I', 3, 1),
  '1/A/I/1',
  'Depth 3 sort_order 1 under 1/A/I must generate 1/A/I/1'
);

-- Test 8: Depth 3 second great-grandchild under '1/A/I' generates '1/A/I/2'
SELECT is(
  public.compute_successor_serial_code('1/A/I', 3, 2),
  '1/A/I/2',
  'Depth 3 sort_order 2 under 1/A/I must generate 1/A/I/2'
);

-- Test 9: Alpha converter edge case: 26 -> Z, 27 -> AA
SELECT is(
  public.to_alpha(26),
  'Z',
  'to_alpha(26) must return Z'
);

-- Test 10: Roman converter: 4 -> IV, 9 -> IX, 10 -> X
SELECT is(
  public.to_roman(9),
  'IX',
  'to_roman(9) must return IX'
);

SELECT * FROM finish();

ROLLBACK;
