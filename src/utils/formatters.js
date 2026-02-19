/**
 * Format a price number to 2 decimal places with $ prefix.
 */
export function formatPrice(n) {
  if (n == null || isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/**
 * Format a decimal ratio as a percentage string (e.g. 0.053 → "+5.30%").
 * Accepts either a ratio (< 1) or already-expanded percent value.
 */
export function formatPercent(n) {
  if (n == null || isNaN(n)) return '—';
  const value = Math.abs(n) < 2 ? n * 100 : n;
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Format a volume number with K/M/B abbreviation.
 */
export function formatVolume(n) {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

/**
 * Format a large currency number with K/M/B abbreviation.
 */
export function formatCurrency(n) {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1_000_000_000_000) return `$${(n / 1_000_000_000_000).toFixed(2)}T`;
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}
