/*
  # Fix format_rupiah Function Search Path

  1. Security Fix
    - Add immutable search_path to format_rupiah function
    - Prevents search path manipulation attacks
    - Follows PostgreSQL security best practices

  2. Changes
    - Drop and recreate format_rupiah with SET search_path = public, pg_temp
    - Function behavior remains identical
    - Only security posture improved
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS format_rupiah(numeric);

-- Recreate with proper search_path
CREATE OR REPLACE FUNCTION format_rupiah(amount numeric)
RETURNS text
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN 'Rp ' || TRIM(TO_CHAR(amount, 'FM999,999,999,999'));
END;
$$;

COMMENT ON FUNCTION format_rupiah IS 'Formats numeric values as Indonesian Rupiah currency with proper security settings';
