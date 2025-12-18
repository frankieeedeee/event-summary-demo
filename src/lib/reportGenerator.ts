import type { AttendeeRow, ReportData, ReportRow, GatewayBreakdownRow, GatewayReportRow, TicketTypeBreakdownRow } from './types';

export function generateReport(
  validAttendees: AttendeeRow[],
  cancelledAttendees: AttendeeRow[]
): ReportData {
  console.log(`[Report Generator] Generating report with ${validAttendees.length} valid and ${cancelledAttendees.length} cancelled attendees`);
  
  // Use event name from first valid attendee (or first cancelled if no valid)
  const eventName =
    validAttendees.length > 0
      ? validAttendees[0].eventName
      : cancelledAttendees.length > 0
        ? cancelledAttendees[0].eventName
        : '';

  console.log(`[Report Generator] Event name: "${eventName}"`);

  // Combine all attendees
  const allAttendees = [...validAttendees, ...cancelledAttendees];
  console.log(`[Report Generator] Total attendees to process: ${allAttendees.length}`);

  // Aggregate by ticket type
  const ticketTypeMap = new Map<string, ReportRow>();
  // Track gateway breakdowns: ticketType -> gateway -> breakdown
  const gatewayBreakdownMap = new Map<string, Map<string, GatewayBreakdownRow>>();

  // Aggregate by gateway (for gateway primary dimension)
  const gatewayMap = new Map<string, GatewayReportRow>();
  // Track ticket type breakdowns: gateway -> ticketType -> breakdown
  const ticketTypeBreakdownMap = new Map<string, Map<string, TicketTypeBreakdownRow>>();

  for (const attendee of allAttendees) {
    // Aggregate by ticket type (primary dimension)
    const existingTicketType = ticketTypeMap.get(attendee.ticketType);

    if (existingTicketType) {
      existingTicketType.totalPaid += attendee.paid;
      if (attendee.status === 'Valid') {
        existingTicketType.validCount += 1;
      } else {
        existingTicketType.cancelledCount += 1;
      }
    } else {
      ticketTypeMap.set(attendee.ticketType, {
        ticketType: attendee.ticketType,
        totalPaid: attendee.paid,
        validCount: attendee.status === 'Valid' ? 1 : 0,
        cancelledCount: attendee.status === 'Cancelled' ? 1 : 0,
      });
    }

    // Track gateway breakdown for ticket type if gateway exists
    if (attendee.gateway) {
      let ticketGatewayMap = gatewayBreakdownMap.get(attendee.ticketType);
      if (!ticketGatewayMap) {
        ticketGatewayMap = new Map();
        gatewayBreakdownMap.set(attendee.ticketType, ticketGatewayMap);
      }

      const gatewayKey = attendee.gateway;
      const existingGateway = ticketGatewayMap.get(gatewayKey);

      if (existingGateway) {
        existingGateway.totalPaid += attendee.paid;
        if (attendee.status === 'Valid') {
          existingGateway.validCount += 1;
        } else {
          existingGateway.cancelledCount += 1;
        }
      } else {
        ticketGatewayMap.set(gatewayKey, {
          gateway: gatewayKey,
          totalPaid: attendee.paid,
          validCount: attendee.status === 'Valid' ? 1 : 0,
          cancelledCount: attendee.status === 'Cancelled' ? 1 : 0,
        });
      }

      // Aggregate by gateway (primary dimension)
      const existingGatewayPrimary = gatewayMap.get(gatewayKey);

      if (existingGatewayPrimary) {
        existingGatewayPrimary.totalPaid += attendee.paid;
        if (attendee.status === 'Valid') {
          existingGatewayPrimary.validCount += 1;
        } else {
          existingGatewayPrimary.cancelledCount += 1;
        }
      } else {
        gatewayMap.set(gatewayKey, {
          gateway: gatewayKey,
          totalPaid: attendee.paid,
          validCount: attendee.status === 'Valid' ? 1 : 0,
          cancelledCount: attendee.status === 'Cancelled' ? 1 : 0,
        });
      }

      // Track ticket type breakdown for gateway
      let gatewayTicketTypeMap = ticketTypeBreakdownMap.get(gatewayKey);
      if (!gatewayTicketTypeMap) {
        gatewayTicketTypeMap = new Map();
        ticketTypeBreakdownMap.set(gatewayKey, gatewayTicketTypeMap);
      }

      const existingTicketTypeBreakdown = gatewayTicketTypeMap.get(attendee.ticketType);

      if (existingTicketTypeBreakdown) {
        existingTicketTypeBreakdown.totalPaid += attendee.paid;
        if (attendee.status === 'Valid') {
          existingTicketTypeBreakdown.validCount += 1;
        } else {
          existingTicketTypeBreakdown.cancelledCount += 1;
        }
      } else {
        gatewayTicketTypeMap.set(attendee.ticketType, {
          ticketType: attendee.ticketType,
          totalPaid: attendee.paid,
          validCount: attendee.status === 'Valid' ? 1 : 0,
          cancelledCount: attendee.status === 'Cancelled' ? 1 : 0,
        });
      }
    }
  }

  // Convert ticket type map to array and sort
  const rows = Array.from(ticketTypeMap.values()).sort((a, b) =>
    a.ticketType.localeCompare(b.ticketType)
  );

  // Attach gateway breakdowns to each ticket type row
  for (const row of rows) {
    const gatewayMapForTicket = gatewayBreakdownMap.get(row.ticketType);
    if (gatewayMapForTicket && gatewayMapForTicket.size > 0) {
      row.gatewayBreakdown = Array.from(gatewayMapForTicket.values()).sort((a, b) =>
        a.gateway.localeCompare(b.gateway)
      );
    }
  }

  // Convert gateway map to array and sort
  const gatewayRows = Array.from(gatewayMap.values()).sort((a, b) =>
    a.gateway.localeCompare(b.gateway)
  );

  // Attach ticket type breakdowns to each gateway row
  for (const row of gatewayRows) {
    const ticketTypeMapForGateway = ticketTypeBreakdownMap.get(row.gateway);
    if (ticketTypeMapForGateway && ticketTypeMapForGateway.size > 0) {
      row.ticketTypeBreakdown = Array.from(ticketTypeMapForGateway.values()).sort((a, b) =>
        a.ticketType.localeCompare(b.ticketType)
      );
    }
  }

  console.log(`[Report Generator] Generated report with ${rows.length} ticket types and ${gatewayRows.length} gateways:`, { rows, gatewayRows });

  return {
    eventName,
    rows,
    gatewayRows,
  };
}

