import Papa, { type ParseResult } from 'papaparse';
import type { AttendeeRow, AttendeeStatus } from './types';
import { CSV_COLUMNS } from './csvColumns';

export async function parseCSVFile(
  file: File,
  status: AttendeeStatus
): Promise<AttendeeRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: ParseResult<Record<string, string>>) => {
        try {
          const rows: AttendeeRow[] = [];
          
          for (const row of results.data as Record<string, string>[]) {
            const eventName = row[CSV_COLUMNS.EVENT_NAME]?.trim() || '';
            const ticketType = row[CSV_COLUMNS.TICKET_TYPE]?.trim() || '';
            const paidStr = row[CSV_COLUMNS.PAID]?.trim() || '0';
            const gateway = row[CSV_COLUMNS.GATEWAY]?.trim() || undefined;
            
            // Parse numeric values - handle currency formats and numbers
            const parseNumeric = (str: string) => parseFloat(str?.replace(/[^0-9.-]/g, '') || '0') || 0;
            
            const paid = parseNumeric(paidStr);
            const humanitixPassedOnFees = parseNumeric(row[CSV_COLUMNS.HUMANITIX_PASSED_ON_FEES] || '0');
            const humanitixAbsorbedFees = parseNumeric(row[CSV_COLUMNS.HUMANITIX_ABSORBED_FEES] || '0');
            const amexSurcharge = parseNumeric(row[CSV_COLUMNS.AMEX_SURCHARGE] || '0');
            const customTax = parseNumeric(row[CSV_COLUMNS.CUSTOM_TAX] || '0');
            const zipFeeAbsorbed = parseNumeric(row[CSV_COLUMNS.ZIP_FEE_ABSORBED] || '0');
            const afterpayFeeAbsorbed = parseNumeric(row[CSV_COLUMNS.AFTERPAY_FEE_ABSORBED] || '0');
            const refunds = parseNumeric(row[CSV_COLUMNS.REFUNDS] || '0');
            const feeRebate = parseNumeric(row[CSV_COLUMNS.FEE_REBATE] || '0');
            const yourEarnings = parseNumeric(row[CSV_COLUMNS.YOUR_EARNINGS] || '0');
            const refundedFees = parseNumeric(row[CSV_COLUMNS.REFUNDED_FEES] || '0');
            const discountRedeemed = parseNumeric(row[CSV_COLUMNS.DISCOUNT_REDEEMED] || '0');
            const taxOnSales = parseNumeric(row[CSV_COLUMNS.TAX_ON_SALES] || '0');
            const taxOnBookingFees = parseNumeric(row[CSV_COLUMNS.TAX_ON_BOOKING_FEES] || '0');
            
            if (eventName && ticketType) {
              rows.push({
                eventName,
                ticketType,
                paid,
                status,
                gateway,
                humanitixPassedOnFees,
                humanitixAbsorbedFees,
                amexSurcharge,
                customTax,
                zipFeeAbsorbed,
                afterpayFeeAbsorbed,
                refunds,
                feeRebate,
                yourEarnings,
                refundedFees,
                discountRedeemed,
                taxOnSales,
                taxOnBookingFees,
              });
            }
          }
          
          resolve(rows);
        } catch (error) {
          reject(new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      },
      error: (error: Error) => {
        reject(new Error(`CSV parsing error: ${error.message || String(error)}`));
      },
    });
  });
}

