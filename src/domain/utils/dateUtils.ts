/**
 * Date utilities for time series operations
 */

/**
 * Check if a date string is valid in YYYY-MM-DD format
 */
export const isValidDate = (dateStr: string): boolean => {
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
};

/**
 * Format a Date object to YYYY-MM-DD string
 */
export const formatDateForAPI = (date: Date): string => {
  const result = date.toISOString().split('T')[0];
  if (!result) {
    throw new Error('Invalid date format');
  }
  return result;
};

/**
 * Add days to a date
 */
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Get today's date in YYYY-MM-DD format
 */
export const getTodayString = (): string => {
  return formatDateForAPI(new Date());
};

/**
 * Get yesterday's date in YYYY-MM-DD format
 */
export const getYesterdayString = (): string => {
  return formatDateForAPI(addDays(new Date(), -1));
};
