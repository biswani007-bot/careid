/**
 * CAREID Facility Localization & Currency Utilities (Goal 016)
 *
 * Provides standardized IANA timezone catalogs, ISO 4217 currencies,
 * pricing fallback policies, and dynamic currency formatters.
 */

export interface TimezoneOption {
  value: string;
  label: string;
}

export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
}

export interface PricingPolicyOption {
  value: string;
  label: string;
  description: string;
}

// Canonical priority IANA timezones covering all primary healthcare regions
const CANONICAL_TIMEZONES: { value: string; label: string }[] = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time [UTC+00:00])' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (India Standard Time [UTC+05:30])' },
  { value: 'Asia/Karachi', label: 'Asia/Karachi (Pakistan Standard Time [UTC+05:00])' },
  { value: 'Europe/London', label: 'Europe/London (Greenwich Mean Time / BST [UTC+00:00 / UTC+01:00])' },
  { value: 'America/New_York', label: 'America/New_York (US Eastern Time [UTC-05:00 / UTC-04:00])' },
  { value: 'America/Chicago', label: 'America/Chicago (US Central Time [UTC-06:00 / UTC-05:00])' },
  { value: 'America/Denver', label: 'America/Denver (US Mountain Time [UTC-07:00 / UTC-06:00])' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (US Pacific Time [UTC-08:00 / UTC-07:00])' },
  { value: 'America/Toronto', label: 'America/Toronto (Canada Eastern Time [UTC-05:00 / UTC-04:00])' },
  { value: 'Europe/Paris', label: 'Europe/Paris (Central European Time [UTC+01:00 / UTC+02:00])' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (Central European Time [UTC+01:00 / UTC+02:00])' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (Gulf Standard Time [UTC+04:00])' },
  { value: 'Asia/Riyadh', label: 'Asia/Riyadh (Arabia Standard Time [UTC+03:00])' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (Singapore Standard Time [UTC+08:00])' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (Japan Standard Time [UTC+09:00])' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (Australian Eastern Time [UTC+10:00 / UTC+11:00])' },
  { value: 'Pacific/Auckland', label: 'Pacific/Auckland (New Zealand Standard Time [UTC+12:00 / UTC+13:00])' },
];

/**
 * Returns complete sorted list of standard IANA timezones.
 * Dynamically includes browser-supported IANA timezones with deduplication.
 */
export function getIanaTimezones(): TimezoneOption[] {
  const result: TimezoneOption[] = [...CANONICAL_TIMEZONES];
  const seen = new Set(result.map((t) => t.value));

  try {
    if (typeof Intl !== 'undefined' && typeof (Intl as any).supportedValuesOf === 'function') {
      const allZones: string[] = (Intl as any).supportedValuesOf('timeZone');
      for (const zone of allZones) {
        if (!seen.has(zone)) {
          seen.add(zone);
          result.push({ value: zone, label: `${zone}` });
        }
      }
    }
  } catch {
    // Fallback to canonical list if supportedValuesOf is unavailable
  }

  return result;
}

export const ISO_CURRENCIES: CurrencyOption[] = [
  { code: 'USD', symbol: '$', name: 'USD — US Dollar ($)' },
  { code: 'INR', symbol: '₹', name: 'INR — Indian Rupee (₹)' },
  { code: 'GBP', symbol: '£', name: 'GBP — British Pound (£)' },
  { code: 'PKR', symbol: '₨', name: 'PKR — Pakistani Rupee (₨)' },
  { code: 'EUR', symbol: '€', name: 'EUR — Euro (€)' },
  { code: 'CAD', symbol: 'CA$', name: 'CAD — Canadian Dollar (CA$)' },
  { code: 'AUD', symbol: 'A$', name: 'AUD — Australian Dollar (A$)' },
  { code: 'AED', symbol: 'AED', name: 'AED — UAE Dirham (AED)' },
  { code: 'SAR', symbol: 'SAR', name: 'SAR — Saudi Riyal (SAR)' },
  { code: 'SGD', symbol: 'S$', name: 'SGD — Singapore Dollar (S$)' },
];

export const PRICING_FALLBACK_POLICIES: PricingPolicyOption[] = [
  {
    value: 'REQUIRE_EXPLICIT_PRICE',
    label: 'Require Explicit Facility Price (Strict Safety)',
    description: 'Procedures must have an approved facility chargemaster price. Blocks offers without explicit pricing.',
  },
  {
    value: 'ALLOW_COMPATIBLE_CATALOGUE',
    label: 'Allow Compatible Catalogue Fallback (Currency-Checked)',
    description: 'Allows standard catalogue baseline charge only if procedure catalogue currency matches facility currency.',
  },
];

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
    const symbolMap: Record<string, string> = {
      USD: '$',
      INR: '₹',
      GBP: '£',
      PKR: '₨ ',
      EUR: '€',
      CAD: 'CA$',
      AUD: 'A$',
      AED: 'AED ',
      SAR: 'SAR ',
      SGD: 'S$',
    };
    const sym = symbolMap[validCur] || `${validCur} `;
    return `${sym}${Number(amount).toLocaleString('en-US')}`;
  }
}
