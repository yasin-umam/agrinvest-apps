/*
  # Fix format_rupiah Function to Use Dot Separator

  1. Changes
    - Update format_rupiah() function to correctly format numbers with dot (.) as thousand separator
    - Use replace approach to convert comma to dot
    
  2. Format
    - Input: 1000000
    - Output: "1.000.000" (not "1,000,000")
*/

-- Update fungsi format_rupiah untuk menggunakan titik sebagai pemisah ribuan
CREATE OR REPLACE FUNCTION format_rupiah(amount numeric)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Format angka dengan to_char (menghasilkan koma), lalu ganti koma dengan titik
  RETURN replace(to_char(amount, 'FM999,999,999,999,999'), ',', '.');
END;
$$;
