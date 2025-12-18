import type { AttendeeRow, ReportData, ReportRow, GatewayBreakdownRow, GatewayReportRow, TicketTypeBreakdownRow, SalesChannelBreakdownRow, SalesChannelReportRow } from './types';

// Helper function to initialize zero values for all numeric fields
function initZeroNumericFields() {
  return {
    humanitixPassedOnFees: 0,
    humanitixAbsorbedFees: 0,
    amexSurcharge: 0,
    customTax: 0,
    zipFeeAbsorbed: 0,
    afterpayFeeAbsorbed: 0,
    refunds: 0,
    feeRebate: 0,
    yourEarnings: 0,
    refundedFees: 0,
    discountRedeemed: 0,
    taxOnSales: 0,
    taxOnBookingFees: 0,
  };
}

// Helper function to aggregate numeric fields from attendee to row
function aggregateNumericFields(target: any, source: AttendeeRow) {
  target.humanitixPassedOnFees += source.humanitixPassedOnFees;
  target.humanitixAbsorbedFees += source.humanitixAbsorbedFees;
  target.amexSurcharge += source.amexSurcharge;
  target.customTax += source.customTax;
  target.zipFeeAbsorbed += source.zipFeeAbsorbed;
  target.afterpayFeeAbsorbed += source.afterpayFeeAbsorbed;
  target.refunds += source.refunds;
  target.feeRebate += source.feeRebate;
  target.yourEarnings += source.yourEarnings;
  target.refundedFees += source.refundedFees;
  target.discountRedeemed += source.discountRedeemed;
  target.taxOnSales += source.taxOnSales;
  target.taxOnBookingFees += source.taxOnBookingFees;
}

export function generateReport(
  validAttendees: AttendeeRow[],
  cancelledAttendees: AttendeeRow[]
): ReportData {
  const startTime = performance.now();
  console.log(`[ReportGenerator] generateReport: Starting - Valid: ${validAttendees.length}, Cancelled: ${cancelledAttendees.length}`);
  
  // Use event name from first valid attendee (or first cancelled if no valid)
  const eventName =
    validAttendees.length > 0
      ? validAttendees[0].eventName
      : cancelledAttendees.length > 0
        ? cancelledAttendees[0].eventName
        : '';

  // Combine all attendees
  const combineStart = performance.now();
  const allAttendees = [...validAttendees, ...cancelledAttendees];
  console.log(`[ReportGenerator] Combined ${allAttendees.length} attendees in ${(performance.now() - combineStart).toFixed(2)}ms`);

  // Aggregate by ticket type
  const ticketTypeMap = new Map<string, ReportRow>();
  // Track gateway breakdowns: ticketType -> gateway -> breakdown
  const gatewayBreakdownMap = new Map<string, Map<string, GatewayBreakdownRow>>();
  // Track sales channel breakdowns: ticketType -> salesChannel -> breakdown
  const salesChannelBreakdownMapForTicket = new Map<string, Map<string, SalesChannelBreakdownRow>>();

  // Aggregate by gateway (for gateway primary dimension)
  const gatewayMap = new Map<string, GatewayReportRow>();
  // Track ticket type breakdowns: gateway -> ticketType -> breakdown
  const ticketTypeBreakdownMap = new Map<string, Map<string, TicketTypeBreakdownRow>>();
  // Track sales channel breakdowns: gateway -> salesChannel -> breakdown
  const salesChannelBreakdownMapForGateway = new Map<string, Map<string, SalesChannelBreakdownRow>>();

  // Aggregate by sales channel (for sales channel primary dimension)
  const salesChannelMap = new Map<string, SalesChannelReportRow>();
  // Track ticket type breakdowns: salesChannel -> ticketType -> breakdown
  const ticketTypeBreakdownMapForSalesChannel = new Map<string, Map<string, TicketTypeBreakdownRow>>();
  // Track gateway breakdowns: salesChannel -> gateway -> breakdown
  const gatewayBreakdownMapForSalesChannel = new Map<string, Map<string, GatewayBreakdownRow>>();

  const loopStart = performance.now();
  let processedCount = 0;
  const logInterval = Math.max(10000, Math.floor(allAttendees.length / 10)); // Log every 10% or every 10k items
  
  for (const attendee of allAttendees) {
    processedCount++;
    
    if (processedCount % logInterval === 0) {
      const elapsed = performance.now() - loopStart;
      const rate = processedCount / elapsed * 1000; // items per second
      console.log(`[ReportGenerator] Processed ${processedCount}/${allAttendees.length} (${(processedCount / allAttendees.length * 100).toFixed(1)}%) - ${rate.toFixed(0)} items/sec`);
    }
    // Aggregate by ticket type (primary dimension)
    const existingTicketType = ticketTypeMap.get(attendee.ticketType);

    if (existingTicketType) {
      existingTicketType.totalPaid += attendee.paid;
      if (attendee.status === 'Valid') {
        existingTicketType.validCount += 1;
      } else {
        existingTicketType.cancelledCount += 1;
      }
      aggregateNumericFields(existingTicketType, attendee);
    } else {
      ticketTypeMap.set(attendee.ticketType, {
        ticketType: attendee.ticketType,
        totalPaid: attendee.paid,
        validCount: attendee.status === 'Valid' ? 1 : 0,
        cancelledCount: attendee.status === 'Cancelled' ? 1 : 0,
        ...initZeroNumericFields(),
      });
      aggregateNumericFields(ticketTypeMap.get(attendee.ticketType)!, attendee);
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
        aggregateNumericFields(existingGateway, attendee);
      } else {
        ticketGatewayMap.set(gatewayKey, {
          gateway: gatewayKey,
          totalPaid: attendee.paid,
          validCount: attendee.status === 'Valid' ? 1 : 0,
          cancelledCount: attendee.status === 'Cancelled' ? 1 : 0,
          ...initZeroNumericFields(),
        });
        aggregateNumericFields(ticketGatewayMap.get(gatewayKey)!, attendee);
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
        aggregateNumericFields(existingGatewayPrimary, attendee);
      } else {
        gatewayMap.set(gatewayKey, {
          gateway: gatewayKey,
          totalPaid: attendee.paid,
          validCount: attendee.status === 'Valid' ? 1 : 0,
          cancelledCount: attendee.status === 'Cancelled' ? 1 : 0,
          ...initZeroNumericFields(),
        });
        aggregateNumericFields(gatewayMap.get(gatewayKey)!, attendee);
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
        aggregateNumericFields(existingTicketTypeBreakdown, attendee);
      } else {
        gatewayTicketTypeMap.set(attendee.ticketType, {
          ticketType: attendee.ticketType,
          totalPaid: attendee.paid,
          validCount: attendee.status === 'Valid' ? 1 : 0,
          cancelledCount: attendee.status === 'Cancelled' ? 1 : 0,
          ...initZeroNumericFields(),
        });
        aggregateNumericFields(gatewayTicketTypeMap.get(attendee.ticketType)!, attendee);
      }

      // Track sales channel breakdown for gateway
      if (attendee.salesChannel) {
        let gatewaySalesChannelMap = salesChannelBreakdownMapForGateway.get(gatewayKey);
        if (!gatewaySalesChannelMap) {
          gatewaySalesChannelMap = new Map();
          salesChannelBreakdownMapForGateway.set(gatewayKey, gatewaySalesChannelMap);
        }

        const existingSalesChannelBreakdown = gatewaySalesChannelMap.get(attendee.salesChannel);
        if (existingSalesChannelBreakdown) {
          existingSalesChannelBreakdown.totalPaid += attendee.paid;
          if (attendee.status === 'Valid') {
            existingSalesChannelBreakdown.validCount += 1;
          } else {
            existingSalesChannelBreakdown.cancelledCount += 1;
          }
          aggregateNumericFields(existingSalesChannelBreakdown, attendee);
        } else {
          gatewaySalesChannelMap.set(attendee.salesChannel, {
            salesChannel: attendee.salesChannel,
            totalPaid: attendee.paid,
            validCount: attendee.status === 'Valid' ? 1 : 0,
            cancelledCount: attendee.status === 'Cancelled' ? 1 : 0,
            ...initZeroNumericFields(),
          });
          aggregateNumericFields(gatewaySalesChannelMap.get(attendee.salesChannel)!, attendee);
        }
      }
    }

    // Track sales channel breakdown for ticket type if sales channel exists
    if (attendee.salesChannel) {
      let ticketSalesChannelMap = salesChannelBreakdownMapForTicket.get(attendee.ticketType);
      if (!ticketSalesChannelMap) {
        ticketSalesChannelMap = new Map();
        salesChannelBreakdownMapForTicket.set(attendee.ticketType, ticketSalesChannelMap);
      }

      const salesChannelKey = attendee.salesChannel;
      const existingSalesChannel = ticketSalesChannelMap.get(salesChannelKey);

      if (existingSalesChannel) {
        existingSalesChannel.totalPaid += attendee.paid;
        if (attendee.status === 'Valid') {
          existingSalesChannel.validCount += 1;
        } else {
          existingSalesChannel.cancelledCount += 1;
        }
        aggregateNumericFields(existingSalesChannel, attendee);
      } else {
        ticketSalesChannelMap.set(salesChannelKey, {
          salesChannel: salesChannelKey,
          totalPaid: attendee.paid,
          validCount: attendee.status === 'Valid' ? 1 : 0,
          cancelledCount: attendee.status === 'Cancelled' ? 1 : 0,
          ...initZeroNumericFields(),
        });
        aggregateNumericFields(ticketSalesChannelMap.get(salesChannelKey)!, attendee);
      }

      // Aggregate by sales channel (primary dimension)
      const existingSalesChannelPrimary = salesChannelMap.get(salesChannelKey);

      if (existingSalesChannelPrimary) {
        existingSalesChannelPrimary.totalPaid += attendee.paid;
        if (attendee.status === 'Valid') {
          existingSalesChannelPrimary.validCount += 1;
        } else {
          existingSalesChannelPrimary.cancelledCount += 1;
        }
        aggregateNumericFields(existingSalesChannelPrimary, attendee);
      } else {
        salesChannelMap.set(salesChannelKey, {
          salesChannel: salesChannelKey,
          totalPaid: attendee.paid,
          validCount: attendee.status === 'Valid' ? 1 : 0,
          cancelledCount: attendee.status === 'Cancelled' ? 1 : 0,
          ...initZeroNumericFields(),
        });
        aggregateNumericFields(salesChannelMap.get(salesChannelKey)!, attendee);
      }

      // Track ticket type breakdown for sales channel
      let salesChannelTicketTypeMap = ticketTypeBreakdownMapForSalesChannel.get(salesChannelKey);
      if (!salesChannelTicketTypeMap) {
        salesChannelTicketTypeMap = new Map();
        ticketTypeBreakdownMapForSalesChannel.set(salesChannelKey, salesChannelTicketTypeMap);
      }

      const existingTicketTypeBreakdown = salesChannelTicketTypeMap.get(attendee.ticketType);

      if (existingTicketTypeBreakdown) {
        existingTicketTypeBreakdown.totalPaid += attendee.paid;
        if (attendee.status === 'Valid') {
          existingTicketTypeBreakdown.validCount += 1;
        } else {
          existingTicketTypeBreakdown.cancelledCount += 1;
        }
        aggregateNumericFields(existingTicketTypeBreakdown, attendee);
      } else {
        salesChannelTicketTypeMap.set(attendee.ticketType, {
          ticketType: attendee.ticketType,
          totalPaid: attendee.paid,
          validCount: attendee.status === 'Valid' ? 1 : 0,
          cancelledCount: attendee.status === 'Cancelled' ? 1 : 0,
          ...initZeroNumericFields(),
        });
        aggregateNumericFields(salesChannelTicketTypeMap.get(attendee.ticketType)!, attendee);
      }

      // Track gateway breakdown for sales channel
      if (attendee.gateway) {
        let salesChannelGatewayMap = gatewayBreakdownMapForSalesChannel.get(salesChannelKey);
        if (!salesChannelGatewayMap) {
          salesChannelGatewayMap = new Map();
          gatewayBreakdownMapForSalesChannel.set(salesChannelKey, salesChannelGatewayMap);
        }

        const existingGatewayBreakdown = salesChannelGatewayMap.get(attendee.gateway);
        if (existingGatewayBreakdown) {
          existingGatewayBreakdown.totalPaid += attendee.paid;
          if (attendee.status === 'Valid') {
            existingGatewayBreakdown.validCount += 1;
          } else {
            existingGatewayBreakdown.cancelledCount += 1;
          }
          aggregateNumericFields(existingGatewayBreakdown, attendee);
        } else {
          salesChannelGatewayMap.set(attendee.gateway, {
            gateway: attendee.gateway,
            totalPaid: attendee.paid,
            validCount: attendee.status === 'Valid' ? 1 : 0,
            cancelledCount: attendee.status === 'Cancelled' ? 1 : 0,
            ...initZeroNumericFields(),
          });
          aggregateNumericFields(salesChannelGatewayMap.get(attendee.gateway)!, attendee);
        }
      }
    }
  }
  
  const loopDuration = performance.now() - loopStart;
  console.log(`[ReportGenerator] Main loop completed ${allAttendees.length} items in ${loopDuration.toFixed(2)}ms (${(allAttendees.length / loopDuration * 1000).toFixed(0)} items/sec)`);

  // Collect all unique gateways, ticket types, and sales channels for consistent breakdowns
  const sortStart = performance.now();
  const allGateways = Array.from(gatewayMap.keys()).sort((a, b) => a.localeCompare(b));
  const allTicketTypes = Array.from(ticketTypeMap.keys()).sort((a, b) => a.localeCompare(b));
  const allSalesChannels = Array.from(salesChannelMap.keys()).sort((a, b) => a.localeCompare(b));
  console.log(`[ReportGenerator] Sorted gateways, ticket types, and sales channels in ${(performance.now() - sortStart).toFixed(2)}ms`);

  // Convert ticket type map to array and sort
  const convertStart = performance.now();
  const rows = Array.from(ticketTypeMap.values()).sort((a, b) =>
    a.ticketType.localeCompare(b.ticketType)
  );
  console.log(`[ReportGenerator] Converted ticket type map to array in ${(performance.now() - convertStart).toFixed(2)}ms`);

  // Attach gateway breakdowns to each ticket type row
  // Ensure all gateways appear in each breakdown, even if they have 0 values
  const breakdownStart = performance.now();
  for (const row of rows) {
    const gatewayMapForTicket = gatewayBreakdownMap.get(row.ticketType);
    const gatewayBreakdown: GatewayBreakdownRow[] = [];
    
    for (const gateway of allGateways) {
      const existingBreakdown = gatewayMapForTicket?.get(gateway);
      if (existingBreakdown) {
        gatewayBreakdown.push(existingBreakdown);
      } else {
        // Create empty breakdown for gateway that doesn't exist for this ticket type
        gatewayBreakdown.push({
          gateway,
          totalPaid: 0,
          validCount: 0,
          cancelledCount: 0,
          ...initZeroNumericFields(),
        });
      }
    }
    
    if (gatewayBreakdown.length > 0) {
      row.gatewayBreakdown = gatewayBreakdown;
    }

    // Attach sales channel breakdowns to each ticket type row
    const salesChannelMapForTicket = salesChannelBreakdownMapForTicket.get(row.ticketType);
    const salesChannelBreakdown: SalesChannelBreakdownRow[] = [];
    
    for (const salesChannel of allSalesChannels) {
      const existingBreakdown = salesChannelMapForTicket?.get(salesChannel);
      if (existingBreakdown) {
        salesChannelBreakdown.push(existingBreakdown);
      } else {
        // Create empty breakdown for sales channel that doesn't exist for this ticket type
        salesChannelBreakdown.push({
          salesChannel,
          totalPaid: 0,
          validCount: 0,
          cancelledCount: 0,
          ...initZeroNumericFields(),
        });
      }
    }
    
    if (salesChannelBreakdown.length > 0) {
      row.salesChannelBreakdown = salesChannelBreakdown;
    }
  }
  console.log(`[ReportGenerator] Attached gateway and sales channel breakdowns in ${(performance.now() - breakdownStart).toFixed(2)}ms`);

  // Convert gateway map to array and sort
  const gatewayConvertStart = performance.now();
  const gatewayRows = Array.from(gatewayMap.values()).sort((a, b) =>
    a.gateway.localeCompare(b.gateway)
  );
  console.log(`[ReportGenerator] Converted gateway map to array in ${(performance.now() - gatewayConvertStart).toFixed(2)}ms`);

  // Attach ticket type breakdowns to each gateway row
  // Ensure all ticket types appear in each breakdown, even if they have 0 values
  const ticketTypeBreakdownStart = performance.now();
  for (const row of gatewayRows) {
    const ticketTypeMapForGateway = ticketTypeBreakdownMap.get(row.gateway);
    const ticketTypeBreakdown: TicketTypeBreakdownRow[] = [];
    
    for (const ticketType of allTicketTypes) {
      const existingBreakdown = ticketTypeMapForGateway?.get(ticketType);
      if (existingBreakdown) {
        ticketTypeBreakdown.push(existingBreakdown);
      } else {
        // Create empty breakdown for ticket type that doesn't exist for this gateway
        ticketTypeBreakdown.push({
          ticketType,
          totalPaid: 0,
          validCount: 0,
          cancelledCount: 0,
          ...initZeroNumericFields(),
        });
      }
    }
    
    if (ticketTypeBreakdown.length > 0) {
      row.ticketTypeBreakdown = ticketTypeBreakdown;
    }

    // Attach sales channel breakdowns to each gateway row
    const salesChannelMapForGateway = salesChannelBreakdownMapForGateway.get(row.gateway);
    const salesChannelBreakdown: SalesChannelBreakdownRow[] = [];
    
    for (const salesChannel of allSalesChannels) {
      const existingBreakdown = salesChannelMapForGateway?.get(salesChannel);
      if (existingBreakdown) {
        salesChannelBreakdown.push(existingBreakdown);
      } else {
        // Create empty breakdown for sales channel that doesn't exist for this gateway
        salesChannelBreakdown.push({
          salesChannel,
          totalPaid: 0,
          validCount: 0,
          cancelledCount: 0,
          ...initZeroNumericFields(),
        });
      }
    }
    
    if (salesChannelBreakdown.length > 0) {
      row.salesChannelBreakdown = salesChannelBreakdown;
    }
  }
  console.log(`[ReportGenerator] Attached ticket type and sales channel breakdowns in ${(performance.now() - ticketTypeBreakdownStart).toFixed(2)}ms`);

  // Convert sales channel map to array and sort
  const salesChannelConvertStart = performance.now();
  const salesChannelRows = Array.from(salesChannelMap.values()).sort((a, b) =>
    a.salesChannel.localeCompare(b.salesChannel)
  );
  console.log(`[ReportGenerator] Converted sales channel map to array in ${(performance.now() - salesChannelConvertStart).toFixed(2)}ms`);

  // Attach ticket type and gateway breakdowns to each sales channel row
  const salesChannelBreakdownStart = performance.now();
  for (const row of salesChannelRows) {
    // Attach ticket type breakdowns
    const ticketTypeMapForSalesChannel = ticketTypeBreakdownMapForSalesChannel.get(row.salesChannel);
    const ticketTypeBreakdown: TicketTypeBreakdownRow[] = [];
    
    for (const ticketType of allTicketTypes) {
      const existingBreakdown = ticketTypeMapForSalesChannel?.get(ticketType);
      if (existingBreakdown) {
        ticketTypeBreakdown.push(existingBreakdown);
      } else {
        ticketTypeBreakdown.push({
          ticketType,
          totalPaid: 0,
          validCount: 0,
          cancelledCount: 0,
          ...initZeroNumericFields(),
        });
      }
    }
    
    if (ticketTypeBreakdown.length > 0) {
      row.ticketTypeBreakdown = ticketTypeBreakdown;
    }

    // Attach gateway breakdowns
    const gatewayMapForSalesChannel = gatewayBreakdownMapForSalesChannel.get(row.salesChannel);
    const gatewayBreakdown: GatewayBreakdownRow[] = [];
    
    for (const gateway of allGateways) {
      const existingBreakdown = gatewayMapForSalesChannel?.get(gateway);
      if (existingBreakdown) {
        gatewayBreakdown.push(existingBreakdown);
      } else {
        gatewayBreakdown.push({
          gateway,
          totalPaid: 0,
          validCount: 0,
          cancelledCount: 0,
          ...initZeroNumericFields(),
        });
      }
    }
    
    if (gatewayBreakdown.length > 0) {
      row.gatewayBreakdown = gatewayBreakdown;
    }
  }
  console.log(`[ReportGenerator] Attached ticket type and gateway breakdowns for sales channels in ${(performance.now() - salesChannelBreakdownStart).toFixed(2)}ms`);

  const totalDuration = performance.now() - startTime;
  console.log(`[ReportGenerator] generateReport: Completed in ${totalDuration.toFixed(2)}ms`);

  return {
    eventName,
    rows,
    gatewayRows,
    salesChannelRows,
  };
}

