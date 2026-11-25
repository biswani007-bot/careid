/**
 * CAREID Doctor Web Facility Localization & Currency Utilities (Goal 016)
 *
 * Provides dynamic currency formatters and facility timezone helpers.
 */

export const ISO_CURRENCIES: { code: string; symbol: string; name: string }[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar ($)' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (₹)' },
  { code: 'GBP', symbol: '£', name: 'British Pound (£)' },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee (₨)' },
  { code: 'EUR', symbol: '€', name: 'Euro (€)' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar (CA$)' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar (A$)' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham (AED)' },
  { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal (SAR)' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar (S$)' },
];

/**
 * Returns currency symbol for a given ISO currency code.
 */
export function getCurrencySymbol(currencyCode = 'USD'): string {
  const code = (currencyCode || 'USD').toUpperCase().trim();
  const map: Record<string, string> = {
    USD: '$',
    INR: '₹',
    GBP: '£',
    PKR: '₨',
    EUR: '€',
    CAD: 'CA$',
    AUD: 'A$',
    AED: 'AED',
    SAR: 'SAR',
    SGD: 'S$',
  };
  return map[code] || code;
}

/**
 * Formats a numeric price with the facility's active ISO currency.
 */
export function formatFacilityCurrency(amount: number, currencyCode = 'USD'): string {
  const validCur = (currencyCode || 'USD').toUpperCase().trim();
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: validCur,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    const sym = getCurrencySymbol(validCur);
    return `${sym} ${Number(amount).toLocaleString('en-US')}`;
  }
}

/**
 * Formats a date/time string in a facility's specific IANA timezone.
 */
export function formatInFacilityTimezone(
  dateInput: string | Date,
  timeZone = 'UTC',
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: timeZone || 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  };

  try {
    return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(date);
  } catch {
    // If timezone is invalid or unsupported, fallback to UTC
    return new Intl.DateTimeFormat('en-US', { ...defaultOptions, timeZone: 'UTC', ...options }).format(date);
  }
}
