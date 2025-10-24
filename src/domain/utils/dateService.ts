/**
 * Centralized date validation and manipulation service
 * Handles all date-related operations across the application
 */

export interface DateValidationResult {
  isValid: boolean;
  error?: string;
}

export interface DateRange {
  from: string;
  to: string;
}

export class DateService {
  private static readonly DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
  private static readonly DATE_FORMAT = 'YYYY-MM-DD';

  /**
   * Validates if a date string is in the correct format (YYYY-MM-DD)
   */
  static validateDateFormat(date: string): DateValidationResult {
    if (!date || typeof date !== 'string') {
      return {
        isValid: false,
        error: 'Date is required and must be a string',
      };
    }

    if (!this.DATE_REGEX.test(date)) {
      return {
        isValid: false,
        error: `Invalid date format. Expected ${this.DATE_FORMAT}, got: ${date}`,
      };
    }

    // Validate that it's a real date
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return {
        isValid: false,
        error: `Invalid date: ${date}`,
      };
    }

    return { isValid: true };
  }

  /**
   * Validates multiple dates at once
   */
  static validateDates(dates: { date: string; field: string }[]): DateValidationResult {
    for (const { date, field } of dates) {
      const result = this.validateDateFormat(date);
      if (!result.isValid) {
        return {
          isValid: false,
          error: `${field}: ${result.error}`,
        };
      }
    }
    return { isValid: true };
  }

  /**
   * Validates a date range (from and to dates)
   */
  static validateDateRange(from: string, to?: string): DateValidationResult {
    const datesToValidate = [
      { date: from, field: 'start date' },
      ...(to ? [{ date: to, field: 'end date' }] : []),
    ];

    return this.validateDates(datesToValidate);
  }

  /**
   * Checks if a date range is valid (from <= to)
   */
  static validateDateRangeLogic(from: string, to?: string): DateValidationResult {
    if (!to) {
      return { isValid: true };
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (fromDate > toDate) {
      return {
        isValid: false,
        error: `Start date (${from}) cannot be after end date (${to})`,
      };
    }

    return { isValid: true };
  }

  /**
   * Gets today's date in YYYY-MM-DD format
   */
  static getToday(): string {
    return this.formatDate(new Date());
  }

  /**
   * Gets a date N days ago in YYYY-MM-DD format
   */
  static getDaysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return this.formatDate(date);
  }

  /**
   * Formats a date to YYYY-MM-DD format
   */
  static formatDate(date: Date): string {
    const isoString = date.toISOString().split('T')[0];
    if (!isoString) {
      throw new Error('Invalid date format');
    }
    return isoString;
  }

  /**
   * Parses a date string and returns a Date object
   */
  static parseDate(dateString: string): Date {
    return new Date(dateString);
  }

  /**
   * Checks if a date is in the future
   */
  static isFutureDate(date: string): boolean {
    const parsedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return parsedDate > today;
  }

  /**
   * Checks if a date is in the past
   */
  static isPastDate(date: string): boolean {
    const parsedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return parsedDate < today;
  }

  /**
   * Gets the number of days between two dates
   */
  static getDaysDifference(from: string, to: string): number {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Add days to a date
   */
  static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Format a Date object to YYYY-MM-DD string (alias for formatDate)
   */
  static formatDateForAPI(date: Date): string {
    return this.formatDate(date);
  }

  /**
   * Get yesterday's date in YYYY-MM-DD format
   */
  static getYesterday(): string {
    return this.getDaysAgo(1);
  }

  /**
   * Legacy compatibility - check if a date string is valid
   * @deprecated Use validateDateFormat instead
   */
  static isValidDate(dateStr: string): boolean {
    return this.validateDateFormat(dateStr).isValid;
  }
}
