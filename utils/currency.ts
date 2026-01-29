/**
 * Currency utilities for deal value formatting
 */

export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
];

export const DEFAULT_CURRENCY = 'USD';

export const getCurrencyByCode = (code: string): Currency | undefined => {
  return CURRENCIES.find(c => c.code === code);
};

export const getCurrencySymbol = (code?: string): string => {
  if (!code) return CURRENCIES.find(c => c.code === DEFAULT_CURRENCY)?.symbol || '$';
  const currency = getCurrencyByCode(code);
  return currency?.symbol || '$';
};

export const formatCurrency = (amount: number, currencyCode?: string): string => {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${amount.toLocaleString()}`;
};
