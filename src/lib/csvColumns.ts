/**
 * Central definition of expected CSV column names from Humanitix reports
 */
export const CSV_COLUMNS = {
  EVENT_NAME: 'Event',
  TICKET_TYPE: 'Ticket type',
  PAID: 'Paid',
  GATEWAY: 'Gateway',
} as const;

/**
 * Type for CSV column names
 */
export type CSVColumnName = typeof CSV_COLUMNS[keyof typeof CSV_COLUMNS];

