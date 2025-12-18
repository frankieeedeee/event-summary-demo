export type AttendeeStatus = 'Valid' | 'Cancelled';

export interface AttendeeRow {
  eventName: string;
  ticketType: string;
  paid: number;
  status: AttendeeStatus;
  gateway?: string;
  humanitixPassedOnFees: number;
  humanitixAbsorbedFees: number;
  amexSurcharge: number;
  customTax: number;
  zipFeeAbsorbed: number;
  afterpayFeeAbsorbed: number;
  refunds: number;
  feeRebate: number;
  yourEarnings: number;
  refundedFees: number;
  discountRedeemed: number;
  taxOnSales: number;
  taxOnBookingFees: number;
}

export interface GatewayBreakdownRow {
  gateway: string;
  totalPaid: number;
  validCount: number;
  cancelledCount: number;
  humanitixPassedOnFees: number;
  humanitixAbsorbedFees: number;
  amexSurcharge: number;
  customTax: number;
  zipFeeAbsorbed: number;
  afterpayFeeAbsorbed: number;
  refunds: number;
  feeRebate: number;
  yourEarnings: number;
  refundedFees: number;
  discountRedeemed: number;
  taxOnSales: number;
  taxOnBookingFees: number;
}

export interface TicketTypeBreakdownRow {
  ticketType: string;
  totalPaid: number;
  validCount: number;
  cancelledCount: number;
  humanitixPassedOnFees: number;
  humanitixAbsorbedFees: number;
  amexSurcharge: number;
  customTax: number;
  zipFeeAbsorbed: number;
  afterpayFeeAbsorbed: number;
  refunds: number;
  feeRebate: number;
  yourEarnings: number;
  refundedFees: number;
  discountRedeemed: number;
  taxOnSales: number;
  taxOnBookingFees: number;
}

export interface ReportRow {
  ticketType: string;
  totalPaid: number;
  validCount: number;
  cancelledCount: number;
  humanitixPassedOnFees: number;
  humanitixAbsorbedFees: number;
  amexSurcharge: number;
  customTax: number;
  zipFeeAbsorbed: number;
  afterpayFeeAbsorbed: number;
  refunds: number;
  feeRebate: number;
  yourEarnings: number;
  refundedFees: number;
  discountRedeemed: number;
  taxOnSales: number;
  taxOnBookingFees: number;
  gatewayBreakdown?: GatewayBreakdownRow[];
}

export interface GatewayReportRow {
  gateway: string;
  totalPaid: number;
  validCount: number;
  cancelledCount: number;
  humanitixPassedOnFees: number;
  humanitixAbsorbedFees: number;
  amexSurcharge: number;
  customTax: number;
  zipFeeAbsorbed: number;
  afterpayFeeAbsorbed: number;
  refunds: number;
  feeRebate: number;
  yourEarnings: number;
  refundedFees: number;
  discountRedeemed: number;
  taxOnSales: number;
  taxOnBookingFees: number;
  ticketTypeBreakdown?: TicketTypeBreakdownRow[];
}

export interface ReportData {
  eventName: string;
  rows: ReportRow[];
  gatewayRows?: GatewayReportRow[];
}

