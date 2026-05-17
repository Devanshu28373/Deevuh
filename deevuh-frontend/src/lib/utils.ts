/**
 * Shared utility functions used across the frontend.
 * Centralizes commonly duplicated helpers.
 */

/**
 * Formats a price in paise (Indian subunit) to a human-readable INR string.
 * @param paise - Amount in paise (e.g., 199900 = ₹1,999)
 * @returns Formatted string like "₹1,999"
 */
export function formatPrice(paise: number): string {
  if (paise == null || isNaN(paise)) return '₹0';
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

/**
 * Generates a consistent class name string from conditional class entries.
 * Lightweight alternative to `clsx` without adding a dependency.
 * @example cn(styles.card, isActive && styles.active, 'my-class')
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
