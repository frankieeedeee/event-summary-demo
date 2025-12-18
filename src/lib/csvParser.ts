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
            
            // Parse paid value - handle currency formats and numbers
            const paid = parseFloat(paidStr.replace(/[^0-9.-]/g, '')) || 0;
            
            if (eventName && ticketType) {
              rows.push({
                eventName,
                ticketType,
                paid,
                status,
                gateway,
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

