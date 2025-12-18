import type { ReportRow, GatewayReportRow, GatewayBreakdownRow, TicketTypeBreakdownRow } from './types';

export type ColumnValueFormatter = (value: any) => string;
export type ColumnValueExtractor<T = any> = (row: T) => any;

export interface ReportColumn<T = any> {
  id: string;
  label: string;
  description?: string;
  extractValue: ColumnValueExtractor<T>;
  formatValue?: ColumnValueFormatter;
  csvFormatValue?: ColumnValueFormatter; // Optional separate formatter for CSV
}

// Primary dimension columns
export const TICKET_TYPE_COLUMN: ReportColumn<ReportRow> = {
  id: 'ticketType',
  label: 'Ticket Type',
  description: 'The name of the primary or secondary ticket',
  extractValue: (row) => row.ticketType,
};

export const GATEWAY_COLUMN: ReportColumn<GatewayReportRow> = {
  id: 'gateway',
  label: 'Gateway',
  description: 'The payment gateway that was used to process the order',
  extractValue: (row) => row.gateway,
};

// Breakdown dimension columns
export const GATEWAY_BREAKDOWN_COLUMN: ReportColumn<GatewayBreakdownRow> = {
  id: 'gateway',
  label: 'Gateway',
  description: 'The payment gateway that was used to process the order',
  extractValue: (row) => row.gateway,
};

export const TICKET_TYPE_BREAKDOWN_COLUMN: ReportColumn<TicketTypeBreakdownRow> = {
  id: 'ticketType',
  label: 'Ticket Type',
  description: 'The name of the primary or secondary ticket',
  extractValue: (row) => row.ticketType,
};

// Data columns - these are the metrics/measures
export const PAID_COLUMN: ReportColumn<ReportRow | GatewayReportRow | GatewayBreakdownRow | TicketTypeBreakdownRow> = {
  id: 'totalPaid',
  label: 'Paid',
  description: 'The gross amount paid by the customer, including all fees and surcharges',
  extractValue: (row) => row.totalPaid,
  formatValue: (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  },
  csvFormatValue: (value: number) => value.toFixed(2),
};

export const VALID_TICKETS_COLUMN: ReportColumn<ReportRow | GatewayReportRow | GatewayBreakdownRow | TicketTypeBreakdownRow> = {
  id: 'validCount',
  label: 'Valid Tickets',
  description: 'The number of valid tickets currently issued for this event',
  extractValue: (row) => row.validCount,
};

export const CANCELLED_TICKETS_COLUMN: ReportColumn<ReportRow | GatewayReportRow | GatewayBreakdownRow | TicketTypeBreakdownRow> = {
  id: 'cancelledCount',
  label: 'Cancelled Tickets',
  description: 'The number of tickets that have been cancelled, either due to refunds, resales or ticket swaps',
  extractValue: (row) => row.cancelledCount,
};

// Column configuration for different views
export function getColumnsForView(
  primaryDimension: 'ticketType' | 'gateway',
  hasBreakdown: boolean
): ReportColumn[] {
  const columns: ReportColumn[] = [];

  // Primary dimension column
  if (primaryDimension === 'ticketType') {
    columns.push(TICKET_TYPE_COLUMN);
  } else {
    columns.push(GATEWAY_COLUMN);
  }

  // Breakdown column (if active)
  if (hasBreakdown) {
    if (primaryDimension === 'ticketType') {
      columns.push(GATEWAY_BREAKDOWN_COLUMN);
    } else {
      columns.push(TICKET_TYPE_BREAKDOWN_COLUMN);
    }
  }

  // Data columns
  columns.push(PAID_COLUMN, VALID_TICKETS_COLUMN, CANCELLED_TICKETS_COLUMN);

  return columns;
}

