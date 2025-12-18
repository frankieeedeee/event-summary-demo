export type AttendeeStatus = 'Valid' | 'Cancelled';

export interface AttendeeRow {
  eventName: string;
  ticketType: string;
  paid: number;
  status: AttendeeStatus;
  gateway?: string;
}

export interface GatewayBreakdownRow {
  gateway: string;
  totalPaid: number;
  validCount: number;
  cancelledCount: number;
}

export interface TicketTypeBreakdownRow {
  ticketType: string;
  totalPaid: number;
  validCount: number;
  cancelledCount: number;
}

export interface ReportRow {
  ticketType: string;
  totalPaid: number;
  validCount: number;
  cancelledCount: number;
  gatewayBreakdown?: GatewayBreakdownRow[];
}

export interface GatewayReportRow {
  gateway: string;
  totalPaid: number;
  validCount: number;
  cancelledCount: number;
  ticketTypeBreakdown?: TicketTypeBreakdownRow[];
}

export interface ReportData {
  eventName: string;
  rows: ReportRow[];
  gatewayRows?: GatewayReportRow[];
}

