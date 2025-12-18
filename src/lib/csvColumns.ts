/**
 * Central definition of expected CSV column names from Humanitix reports
 */
export const CSV_COLUMNS = {
  EVENT_NAME: 'Event',
  EVENT_DATE: 'Event date',
  EVENT_TIME: 'Event time',
  TICKET_TYPE: 'Ticket type',
  PAID: 'Paid',
  GATEWAY: 'Gateway',
  SALES_CHANNEL: 'Sales Channel',
  HUMANITIX_PASSED_ON_FEES: 'Humanitix passed-on fees',
  HUMANITIX_ABSORBED_FEES: 'Humanitix absorbed fees',
  AMEX_SURCHARGE: 'Amex surcharge',
  CUSTOM_TAX: 'Custom tax',
  ZIP_FEE_ABSORBED: 'Zip fee(absorbed)',
  AFTERPAY_FEE_ABSORBED: 'Afterpay fee(absorbed)',
  REFUNDS: 'Refunds',
  FEE_REBATE: 'Fee rebate',
  YOUR_EARNINGS: 'Your earnings',
  REFUNDED_FEES: 'Refunded fees',
  DISCOUNT_REDEEMED: 'Discount redeemed',
  TAX_ON_SALES: 'Tax on sales',
  TAX_ON_BOOKING_FEES: 'Tax on booking fees',
} as const;

/**
 * Type for CSV column names
 */
export type CSVColumnName = typeof CSV_COLUMNS[keyof typeof CSV_COLUMNS];

