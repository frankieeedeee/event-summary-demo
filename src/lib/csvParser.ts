import Papa, { type ParseResult } from 'papaparse';
import type { AttendeeRow, AttendeeStatus } from './types';
import { CSV_COLUMNS } from './csvColumns';

export async function parseCSVFile(
  file: File,
  status: AttendeeStatus
): Promise<AttendeeRow[]> {
  return new Promise((resolve, reject) => {
    console.log(`[CSV Parser] Starting to parse ${status} attendees file: ${file.name}`);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: ParseResult<Record<string, string>>) => {
        try {
          console.log(`[CSV Parser] Parse complete for ${status} file. Total rows: ${results.data.length}`);
          
          // Log column names from first row if available
          if (results.data.length > 0) {
            const firstRow = results.data[0] as Record<string, string>;
            const columnNames = Object.keys(firstRow);
            console.log(`[CSV Parser] Column names found in CSV:`, columnNames);
            console.log(`[CSV Parser] Expected columns:`, Object.values(CSV_COLUMNS));
            
            // Check if expected columns exist
            const missingColumns = Object.values(CSV_COLUMNS).filter(
              col => !columnNames.includes(col)
            );
            if (missingColumns.length > 0) {
              console.warn(`[CSV Parser] Missing expected columns:`, missingColumns);
            }
            
            console.log(`[CSV Parser] First row sample:`, firstRow);
          }
          
          const rows: AttendeeRow[] = [];
          let skippedRows = 0;
          
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
            } else {
              skippedRows++;
              if (skippedRows <= 3) {
                console.log(`[CSV Parser] Skipped row (missing eventName or ticketType):`, {
                  eventName,
                  ticketType,
                  rawRow: row
                });
              }
            }
          }
          
          console.log(`[CSV Parser] Parsed ${rows.length} valid ${status} attendee rows (skipped ${skippedRows} rows)`);
          if (rows.length > 0) {
            console.log(`[CSV Parser] Sample parsed rows:`, rows.slice(0, 3));
          }
          
          resolve(rows);
        } catch (error) {
          console.error(`[CSV Parser] Error processing ${status} file:`, error);
          reject(new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      },
      error: (error: Error) => {
        console.error(`[CSV Parser] Parse error for ${status} file:`, error);
        reject(new Error(`CSV parsing error: ${error.message || String(error)}`));
      },
    });
  });
}

