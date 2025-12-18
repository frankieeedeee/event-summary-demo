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

// Currency formatter for monetary columns
const currencyFormatter = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

const currencyCsvFormatter = (value: number) => value.toFixed(2);

export const HUMANITIX_PASSED_ON_FEES_COLUMN: ReportColumn<ReportRow | GatewayReportRow | GatewayBreakdownRow | TicketTypeBreakdownRow> = {
  id: 'humanitixPassedOnFees',
  label: 'Humanitix passed-on fees',
  description: 'The total booking fee amount passed-on to customers',
  extractValue: (row) => row.humanitixPassedOnFees,
  formatValue: currencyFormatter,
  csvFormatValue: currencyCsvFormatter,
};

export const HUMANITIX_ABSORBED_FEES_COLUMN: ReportColumn<ReportRow | GatewayReportRow | GatewayBreakdownRow | TicketTypeBreakdownRow> = {
  id: 'humanitixAbsorbedFees',
  label: 'Humanitix absorbed fees',
  description: 'The total booking amount absorbed within the price of the ticket',
  extractValue: (row) => row.humanitixAbsorbedFees,
  formatValue: currencyFormatter,
  csvFormatValue: currencyCsvFormatter,
};

export const AMEX_SURCHARGE_COLUMN: ReportColumn<ReportRow | GatewayReportRow | GatewayBreakdownRow | TicketTypeBreakdownRow> = {
  id: 'amexSurcharge',
  label: 'Amex surcharge',
  description: 'The total Amex Credit Card surchage passed-on and paid by customers',
  extractValue: (row) => row.amexSurcharge,
  formatValue: currencyFormatter,
  csvFormatValue: currencyCsvFormatter,
};

export const CUSTOM_TAX_COLUMN: ReportColumn<ReportRow | GatewayReportRow | GatewayBreakdownRow | TicketTypeBreakdownRow> = {
  id: 'customTax',
  label: 'Custom tax',
  description: 'Any additional custom sales tax, passed-on and paid by customers, and received by you',
  extractValue: (row) => row.customTax,
  formatValue: currencyFormatter,
  csvFormatValue: currencyCsvFormatter,
};

export const ZIP_FEE_ABSORBED_COLUMN: ReportColumn<ReportRow | GatewayReportRow | GatewayBreakdownRow | TicketTypeBreakdownRow> = {
  id: 'zipFeeAbsorbed',
  label: 'Zip fee(absorbed)',
  description: 'Any Zip payment fees, deducted from ticket sales',
  extractValue: (row) => row.zipFeeAbsorbed,
  formatValue: currencyFormatter,
  csvFormatValue: currencyCsvFormatter,
};

export const AFTERPAY_FEE_ABSORBED_COLUMN: ReportColumn<ReportRow | GatewayReportRow | GatewayBreakdownRow | TicketTypeBreakdownRow> = {
  id: 'afterpayFeeAbsorbed',
  label: 'Afterpay fee(absorbed)',
  description: 'Any Afterpay payment fees, deducted from ticket sales',
  extractValue: (row) => row.afterpayFeeAbsorbed,
  formatValue: currencyFormatter,
  csvFormatValue: currencyCsvFormatter,
};

export const REFUNDS_COLUMN: ReportColumn<ReportRow | GatewayReportRow | GatewayBreakdownRow | TicketTypeBreakdownRow> = {
  id: 'refunds',
  label: 'Refunds',
  description: 'The total amount of refunds issued to customers, excluding any refunded passed-on fees',
  extractValue: (row) => row.refunds,
  formatValue: currencyFormatter,
  csvFormatValue: currencyCsvFormatter,
};

export const FEE_REBATE_COLUMN: ReportColumn<ReportRow | GatewayReportRow | GatewayBreakdownRow | TicketTypeBreakdownRow> = {
  id: 'feeRebate',
  label: 'Fee rebate',
  description: 'The total amount of fee rebate revenue, paid by customers',
  extractValue: (row) => row.feeRebate,
  formatValue: currencyFormatter,
  csvFormatValue: currencyCsvFormatter,
};

export const YOUR_EARNINGS_COLUMN: ReportColumn<ReportRow | GatewayReportRow | GatewayBreakdownRow | TicketTypeBreakdownRow> = {
  id: 'yourEarnings',
  label: 'Your earnings',
  description: 'The total amount of revenue you have earnt so far',
  extractValue: (row) => row.yourEarnings,
  formatValue: currencyFormatter,
  csvFormatValue: currencyCsvFormatter,
};

export const REFUNDED_FEES_COLUMN: ReportColumn<ReportRow | GatewayReportRow | GatewayBreakdownRow | TicketTypeBreakdownRow> = {
  id: 'refundedFees',
  label: 'Refunded fees',
  description: 'The total amount of passed-on fees refunded and returned to customers',
  extractValue: (row) => row.refundedFees,
  formatValue: currencyFormatter,
  csvFormatValue: currencyCsvFormatter,
};

export const DISCOUNT_REDEEMED_COLUMN: ReportColumn<ReportRow | GatewayReportRow | GatewayBreakdownRow | TicketTypeBreakdownRow> = {
  id: 'discountRedeemed',
  label: 'Discount redeemed',
  description: 'The total amount of discounts redeemed and deducted from the ticket price',
  extractValue: (row) => row.discountRedeemed,
  formatValue: currencyFormatter,
  csvFormatValue: currencyCsvFormatter,
};

export const TAX_ON_SALES_COLUMN: ReportColumn<ReportRow | GatewayReportRow | GatewayBreakdownRow | TicketTypeBreakdownRow> = {
  id: 'taxOnSales',
  label: 'Tax on sales',
  description: 'The total amount of taxes charged on ticket sales, paid by customers and collected by Humanitix',
  extractValue: (row) => row.taxOnSales,
  formatValue: currencyFormatter,
  csvFormatValue: currencyCsvFormatter,
};

export const TAX_ON_BOOKING_FEES_COLUMN: ReportColumn<ReportRow | GatewayReportRow | GatewayBreakdownRow | TicketTypeBreakdownRow> = {
  id: 'taxOnBookingFees',
  label: 'Tax on booking fees',
  description: 'The total amount of taxes charged on Humanitix\'s booking fees',
  extractValue: (row) => row.taxOnBookingFees,
  formatValue: currencyFormatter,
  csvFormatValue: currencyCsvFormatter,
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
  columns.push(
    PAID_COLUMN,
    VALID_TICKETS_COLUMN,
    CANCELLED_TICKETS_COLUMN,
    HUMANITIX_PASSED_ON_FEES_COLUMN,
    HUMANITIX_ABSORBED_FEES_COLUMN,
    AMEX_SURCHARGE_COLUMN,
    CUSTOM_TAX_COLUMN,
    ZIP_FEE_ABSORBED_COLUMN,
    AFTERPAY_FEE_ABSORBED_COLUMN,
    REFUNDS_COLUMN,
    FEE_REBATE_COLUMN,
    YOUR_EARNINGS_COLUMN,
    REFUNDED_FEES_COLUMN,
    DISCOUNT_REDEEMED_COLUMN,
    TAX_ON_SALES_COLUMN,
    TAX_ON_BOOKING_FEES_COLUMN
  );

  return columns;
}

// Column configuration for table view (excludes breakdown column from header)
export function getColumnsForTable(
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

  // Note: Breakdown column is NOT included here - it appears as sub-row value in UI

  // Data columns
  columns.push(
    PAID_COLUMN,
    VALID_TICKETS_COLUMN,
    CANCELLED_TICKETS_COLUMN,
    HUMANITIX_PASSED_ON_FEES_COLUMN,
    HUMANITIX_ABSORBED_FEES_COLUMN,
    AMEX_SURCHARGE_COLUMN,
    CUSTOM_TAX_COLUMN,
    ZIP_FEE_ABSORBED_COLUMN,
    AFTERPAY_FEE_ABSORBED_COLUMN,
    REFUNDS_COLUMN,
    FEE_REBATE_COLUMN,
    YOUR_EARNINGS_COLUMN,
    REFUNDED_FEES_COLUMN,
    DISCOUNT_REDEEMED_COLUMN,
    TAX_ON_SALES_COLUMN,
    TAX_ON_BOOKING_FEES_COLUMN
  );

  return columns;
}

