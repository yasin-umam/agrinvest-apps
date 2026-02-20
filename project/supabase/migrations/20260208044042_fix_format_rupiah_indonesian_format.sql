/*
  # Fix format_rupiah Function - Indonesian Format

  1. Problem
    - format_rupiah returns "Rp 2,000,000" (comma separator) instead of "Rp 2.000.000" (dot separator)
    - format_rupiah includes "Rp " prefix causing duplicate "Rp Rp" in notifications
    - Indonesian format uses dot (.) for thousands separator, not comma (,)

  2. Solution
    - Update format_rupiah to return ONLY formatted number (without "Rp " prefix)
    - Use dot (.) as thousands separator for Indonesian format
    - Keep SET search_path for security
    
  3. Changes
    - Input: 1000000
    - Old output: "Rp 1,000,000"
    - New output: "1.000.000" (no prefix, dot separator)
    
  4. Result
    - 'Rp ' || format_rupiah(1000000) will correctly display "Rp 1.000.000"
    - No more duplicate "Rp Rp" in notifications
*/

-- Update format_rupiah function to use Indonesian format (dot separator, no prefix)
CREATE OR REPLACE FUNCTION format_rupiah(amount numeric)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Format number with comma separator using to_char, then replace comma with dot (Indonesian format)
  RETURN replace(to_char(amount, 'FM999,999,999,999,999'), ',', '.');
END;
$$;

COMMENT ON FUNCTION format_rupiah IS 'Formats numeric values as Indonesian number format with dot (.) as thousands separator. Returns only the number without currency prefix.';
