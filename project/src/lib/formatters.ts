/**
 * Format number as Rupiah with period (.) as thousands separator
 * @param amount - The amount to format
 * @returns Formatted string with periods as thousands separator
 */
export const formatRupiah = (amount: number): string => {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

/**
 * Format number with period (.) as thousands separator (for non-currency numbers)
 * @param value - The value to format
 * @returns Formatted string with periods as thousands separator
 */
export const formatNumber = (value: number): string => {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};
