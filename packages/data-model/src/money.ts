/**
 * Money utilities using integer minor units (paise) to guarantee zero floating-point arithmetic drift.
 * 1 INR = 100 paise.
 */

export const CURRENCY_CODE = 'INR';
export const CURRENCY_SYMBOL = '₹';

/**
 * Converts rupees (float or integer) to integer paise.
 */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Converts integer paise to float rupees for display only.
 */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/**
 * Formats paise into Indian Rupee string formatting.
 * Options:
 * - compact: if true, formats as ₹1.45L or ₹2.5Cr
 * - includeSymbol: whether to prefix ₹ (default true)
 */
export function formatINR(paise: number, options?: { compact?: boolean; includeSymbol?: boolean }): string {
  const includeSymbol = options?.includeSymbol !== false;
  const symbol = includeSymbol ? CURRENCY_SYMBOL : '';
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = absPaise / 100;

  if (options?.compact) {
    if (rupees >= 10000000) {
      const cr = (rupees / 10000000).toFixed(2).replace(/\.?0+$/, '');
      return `${isNegative ? '-' : ''}${symbol}${cr}Cr`;
    }
    if (rupees >= 100000) {
      const lakh = (rupees / 100000).toFixed(2).replace(/\.?0+$/, '');
      return `${isNegative ? '-' : ''}${symbol}${lakh}L`;
    }
    if (rupees >= 1000) {
      const k = (rupees / 1000).toFixed(1).replace(/\.?0+$/, '');
      return `${isNegative ? '-' : ''}${symbol}${k}k`;
    }
  }

  // Format standard Indian number system: 1,00,000
  const parts = Math.floor(rupees).toString();
  let lastThree = parts.substring(parts.length - 3);
  const otherNumbers = parts.substring(0, parts.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedRupees = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;

  return `${isNegative ? '-' : ''}${symbol}${formattedRupees}`;
}

/**
 * Percentage calculation with integer paise:
 * (amountPaise * basisPoints) / 10000
 * e.g. 10% = 1000 basis points
 */
export function calculatePercentagePaise(amountPaise: number, percent: number): number {
  const basisPoints = Math.round(percent * 100);
  return Math.round((amountPaise * basisPoints) / 10000);
}

/**
 * Safe integer additions / subtractions
 */
export function addPaise(...values: number[]): number {
  return values.reduce((sum, val) => sum + Math.round(val), 0);
}

export function subtractPaise(minuend: number, ...subtrahends: number[]): number {
  return subtrahends.reduce((diff, val) => diff - Math.round(val), Math.round(minuend));
}
