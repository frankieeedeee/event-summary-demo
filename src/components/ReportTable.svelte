<script lang="ts">
  import type { ReportData, AttendeeRow } from '../lib/types';
  import { getColumnsForView, getColumnsForTable, type ReportColumn } from '../lib/reportColumns';
  import { generateReport } from '../lib/reportGenerator';

  type PrimaryDimension = 'ticketType' | 'gateway' | 'salesChannel';
  type BreakdownType = 'none' | 'gateway' | 'ticketType' | 'salesChannel';

  const { 
    reportData: propReportData,
    validAttendees: allValidAttendees,
    cancelledAttendees: allCancelledAttendees
  } = $props<{ 
    reportData: ReportData | null;
    validAttendees: AttendeeRow[];
    cancelledAttendees: AttendeeRow[];
  }>();

  let primaryDimension = $state<PrimaryDimension>('ticketType');
  let breakdownType = $state<BreakdownType>('none');
  let expandedRows = $state(new Set<string>());
  let selectedDates = $state<Set<string>>(new Set(['all']));
  let dateAccordionExpanded = $state(false);
  let primaryDimensionDropdownOpen = $state(false);
  let breakdownAccordionExpanded = $state(false);

  // Extract unique date/time combinations from all attendees
  const uniqueDates = $derived.by(() => {
    const dateSet = new Set<string>();
    for (const attendee of [...allValidAttendees, ...allCancelledAttendees]) {
      if (attendee.eventDateTime) {
        dateSet.add(attendee.eventDateTime);
      }
    }
    return Array.from(dateSet).sort();
  });

  // Format date/time for display (just show the combined string)
  function formatDateForDisplay(dateTimeStr: string): string {
    return dateTimeStr;
  }

  // Get selection status text
  const selectionStatusText = $derived.by(() => {
    if (selectedDates.has('all')) {
      return 'All dates selected';
    }
    const count = selectedDates.size;
    if (count === 0) {
      return 'No dates selected';
    } else if (count === 1) {
      return '1 date selected';
    } else {
      return `${count} dates selected`;
    }
  });

  // Check if filtering is needed (not "all" selected)
  const needsFiltering = $derived(!selectedDates.has('all'));

  // Filter attendees based on selected dates (only when needed)
  const filteredAttendees = $derived.by(() => {
    if (!needsFiltering) {
      // No filtering needed - return references to avoid creating new arrays
      return {
        valid: allValidAttendees,
        cancelled: allCancelledAttendees,
        isFiltered: false
      };
    }

    const filterStart = performance.now();
    const filteredValid = allValidAttendees.filter((attendee: AttendeeRow) => {
      if (!attendee.eventDateTime) return false;
      return selectedDates.has(attendee.eventDateTime);
    });

    const filteredCancelled = allCancelledAttendees.filter((attendee: AttendeeRow) => {
      if (!attendee.eventDateTime) return false;
      return selectedDates.has(attendee.eventDateTime);
    });
    
    const filterDuration = performance.now() - filterStart;
    console.log(`[ReportTable] Filtered attendees in ${filterDuration.toFixed(2)}ms - Valid: ${filteredValid.length}, Cancelled: ${filteredCancelled.length}`);

    return {
      valid: filteredValid,
      cancelled: filteredCancelled,
      isFiltered: true
    };
  });

  // Generate report from filtered data (only when filtering is active or prop is not available)
  const reportData = $derived.by(() => {
    // If we have a prop reportData and no filtering is needed, use the prop
    if (propReportData && !needsFiltering) {
      return propReportData;
    }
    
    // Otherwise, generate from filtered data
    const genStart = performance.now();
    const filtered = filteredAttendees;
    const result = generateReport(filtered.valid, filtered.cancelled);
    const genDuration = performance.now() - genStart;
    console.log(`[ReportTable] Generated report from filtered data in ${genDuration.toFixed(2)}ms`);
    return result;
  });

  function handleDateSelection(dateStr: string) {
    const newSelectedDates = new Set(selectedDates);
    if (dateStr === 'all') {
      // Toggle "all" - if it's currently selected, unselect it; otherwise select it
      if (newSelectedDates.has('all')) {
        // Unchecking "all" - remove it and allow individual selections
        newSelectedDates.delete('all');
        // If no individual dates are selected, don't add anything (user can then select individual dates)
      } else {
        // Checking "all" - clear individual selections and select all
        newSelectedDates.clear();
        newSelectedDates.add('all');
      }
    } else {
      // If selecting an individual date, remove "all" if present
      newSelectedDates.delete('all');
      if (newSelectedDates.has(dateStr)) {
        // Unchecking an individual date
        newSelectedDates.delete(dateStr);
        // If no dates selected, default to "all"
        if (newSelectedDates.size === 0) {
          newSelectedDates.add('all');
        }
      } else {
        // Checking an individual date
        newSelectedDates.add(dateStr);
      }
    }
    selectedDates = newSelectedDates; // Trigger reactivity
  }

  // Get columns for current view (for CSV export - includes breakdown column)
  function getColumnsForCsv() {
    const hasBreakdown = breakdownType !== 'none';
    return getColumnsForView(primaryDimension, hasBreakdown, breakdownType !== 'none' ? breakdownType : undefined);
  }

  // Get columns for table view (excludes breakdown column - it appears as sub-row value)
  function getColumns() {
    const hasBreakdown = breakdownType !== 'none';
    return getColumnsForTable(primaryDimension, hasBreakdown);
  }

  function getColumnValue<T>(column: ReportColumn<T>, row: T): any {
    return column.extractValue(row);
  }

  function formatColumnValue<T>(column: ReportColumn<T>, row: T): string {
    const value = getColumnValue(column, row);
    if (column.formatValue) {
      return column.formatValue(value);
    }
    return String(value);
  }

  function formatColumnValueForCsv<T>(column: ReportColumn<T>, row: T): string {
    const value = getColumnValue(column, row);
    if (column.csvFormatValue) {
      return String(column.csvFormatValue(value));
    }
    if (column.formatValue) {
      return String(column.formatValue(value));
    }
    return String(value);
  }

  function toggleRow(key: string) {
    expandedRows = new Set(expandedRows);
    if (expandedRows.has(key)) {
      expandedRows.delete(key);
    } else {
      expandedRows.add(key);
    }
    expandedRows = new Set(expandedRows); // Trigger reactivity by creating new Set
  }

  function escapeCsvField(field: string | number): string {
    const str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  function generateCsv(): string {
    const currentReportData = reportData;
    if (!currentReportData) return '';

    const lines: string[] = [];
    const hasBreakdown = breakdownType !== 'none';

    // Build header using column definitions (for CSV, include breakdown column)
    const currentColumns = getColumnsForCsv();
    const headers = currentColumns.map(col => col.label);
    lines.push(headers.map(escapeCsvField).join(','));

    // Generate rows using column definitions
    if (primaryDimension === 'ticketType') {
      for (const row of currentReportData.rows) {
        if (hasBreakdown && breakdownType === 'gateway' && row.gatewayBreakdown && row.gatewayBreakdown.length > 0) {
          // Include gateway breakdown rows
          for (const gatewayRow of row.gatewayBreakdown) {
            const csvRow: string[] = [];
            for (const column of currentColumns) {
              if (column.id === 'ticketType') {
                csvRow.push(escapeCsvField(formatColumnValueForCsv(column, row)));
              } else if (column.id === 'gateway') {
                csvRow.push(escapeCsvField(formatColumnValueForCsv(column, gatewayRow)));
              } else {
                csvRow.push(escapeCsvField(formatColumnValueForCsv(column, gatewayRow)));
              }
            }
            lines.push(csvRow.join(','));
          }
        } else if (hasBreakdown && breakdownType === 'salesChannel' && row.salesChannelBreakdown && row.salesChannelBreakdown.length > 0) {
          // Include sales channel breakdown rows
          for (const salesChannelRow of row.salesChannelBreakdown) {
            const csvRow: string[] = [];
            for (const column of currentColumns) {
              if (column.id === 'ticketType') {
                csvRow.push(escapeCsvField(formatColumnValueForCsv(column, row)));
              } else if (column.id === 'salesChannel') {
                csvRow.push(escapeCsvField(formatColumnValueForCsv(column, salesChannelRow)));
              } else {
                csvRow.push(escapeCsvField(formatColumnValueForCsv(column, salesChannelRow)));
              }
            }
            lines.push(csvRow.join(','));
          }
        } else {
          // Just the summary row
          const csvRow = currentColumns.map(col => 
            escapeCsvField(formatColumnValueForCsv(col, row))
          );
          lines.push(csvRow.join(','));
        }
      }
    } else if (primaryDimension === 'gateway' && currentReportData.gatewayRows) {
      for (const row of currentReportData.gatewayRows) {
        if (hasBreakdown && breakdownType === 'ticketType' && row.ticketTypeBreakdown && row.ticketTypeBreakdown.length > 0) {
          // Include ticket type breakdown rows
          for (const ticketTypeRow of row.ticketTypeBreakdown) {
            const csvRow: string[] = [];
            for (const column of currentColumns) {
              if (column.id === 'gateway') {
                csvRow.push(escapeCsvField(formatColumnValueForCsv(column, row)));
              } else if (column.id === 'ticketType') {
                csvRow.push(escapeCsvField(formatColumnValueForCsv(column, ticketTypeRow)));
              } else {
                csvRow.push(escapeCsvField(formatColumnValueForCsv(column, ticketTypeRow)));
              }
            }
            lines.push(csvRow.join(','));
          }
        } else if (hasBreakdown && breakdownType === 'salesChannel' && row.salesChannelBreakdown && row.salesChannelBreakdown.length > 0) {
          // Include sales channel breakdown rows
          for (const salesChannelRow of row.salesChannelBreakdown) {
            const csvRow: string[] = [];
            for (const column of currentColumns) {
              if (column.id === 'gateway') {
                csvRow.push(escapeCsvField(formatColumnValueForCsv(column, row)));
              } else if (column.id === 'salesChannel') {
                csvRow.push(escapeCsvField(formatColumnValueForCsv(column, salesChannelRow)));
              } else {
                csvRow.push(escapeCsvField(formatColumnValueForCsv(column, salesChannelRow)));
              }
            }
            lines.push(csvRow.join(','));
          }
        } else {
          // Just the summary row
          const csvRow = currentColumns.map(col => 
            escapeCsvField(formatColumnValueForCsv(col, row))
          );
          lines.push(csvRow.join(','));
        }
      }
    } else if (primaryDimension === 'salesChannel' && currentReportData.salesChannelRows) {
      for (const row of currentReportData.salesChannelRows) {
        if (hasBreakdown && breakdownType === 'ticketType' && row.ticketTypeBreakdown && row.ticketTypeBreakdown.length > 0) {
          // Include ticket type breakdown rows
          for (const ticketTypeRow of row.ticketTypeBreakdown) {
            const csvRow: string[] = [];
            for (const column of currentColumns) {
              if (column.id === 'salesChannel') {
                csvRow.push(escapeCsvField(formatColumnValueForCsv(column, row)));
              } else if (column.id === 'ticketType') {
                csvRow.push(escapeCsvField(formatColumnValueForCsv(column, ticketTypeRow)));
              } else {
                csvRow.push(escapeCsvField(formatColumnValueForCsv(column, ticketTypeRow)));
              }
            }
            lines.push(csvRow.join(','));
          }
        } else if (hasBreakdown && breakdownType === 'gateway' && row.gatewayBreakdown && row.gatewayBreakdown.length > 0) {
          // Include gateway breakdown rows
          for (const gatewayRow of row.gatewayBreakdown) {
            const csvRow: string[] = [];
            for (const column of currentColumns) {
              if (column.id === 'salesChannel') {
                csvRow.push(escapeCsvField(formatColumnValueForCsv(column, row)));
              } else if (column.id === 'gateway') {
                csvRow.push(escapeCsvField(formatColumnValueForCsv(column, gatewayRow)));
              } else {
                csvRow.push(escapeCsvField(formatColumnValueForCsv(column, gatewayRow)));
              }
            }
            lines.push(csvRow.join(','));
          }
        } else {
          // Just the summary row
          const csvRow = currentColumns.map(col => 
            escapeCsvField(formatColumnValueForCsv(col, row))
          );
          lines.push(csvRow.join(','));
        }
      }
    }

    return lines.join('\n');
  }

  function downloadCsv() {
    const csv = generateCsv();
    if (!csv) return;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    const currentReportData = reportData;
    link.setAttribute('download', `${currentReportData?.eventName || 'report'}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  // When primary dimension changes, reset breakdown and clear expanded rows
  $effect(() => {
    if (primaryDimension === 'ticketType' && breakdownType === 'ticketType') {
      breakdownType = 'none';
    } else if (primaryDimension === 'gateway' && breakdownType === 'gateway') {
      breakdownType = 'none';
    } else if (primaryDimension === 'salesChannel' && breakdownType === 'salesChannel') {
      breakdownType = 'none';
    }
    expandedRows = new Set();
  });
</script>

{#if reportData}
  <div class="bg-white rounded-lg shadow-md p-6">
    <div class="flex justify-between items-start mb-4">
      <h2 class="text-2xl font-bold text-gray-900">
        Ticket sales summary report
      </h2>
      <button
        type="button"
        onclick={downloadCsv}
        class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center gap-1.5"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
            clip-rule="evenodd"
          />
        </svg>
        Download CSV
      </button>
    </div>

    <div class="mb-4 space-y-3">
      <div class="border border-gray-300 rounded-md">
        <button
          type="button"
          onclick={() => dateAccordionExpanded = !dateAccordionExpanded}
          class="flex items-center justify-between w-full text-left p-3 rounded-t-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 {dateAccordionExpanded ? 'rounded-b-none border-b border-gray-300' : 'rounded-b-md'}"
        >
          <div class="flex flex-col">
            <span class="text-sm font-medium text-gray-700">Event date selection</span>
            <span class="text-xs text-gray-500 mt-0.5">{selectionStatusText}</span>
          </div>
          <svg
            class="w-5 h-5 text-gray-500 transform transition-transform {dateAccordionExpanded ? 'rotate-180' : ''}"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {#if dateAccordionExpanded}
          <div class="space-y-2 p-3 pt-2 border-t border-gray-200 bg-gray-50 rounded-b-md">
            <label class="flex items-center">
              <input
                type="checkbox"
                checked={selectedDates.has('all')}
                onchange={() => handleDateSelection('all')}
                class="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span class="text-sm font-medium text-gray-700">All dates</span>
            </label>
            {#each uniqueDates as dateStr (dateStr)}
              <label class="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedDates.has(dateStr as string)}
                  onchange={() => handleDateSelection(dateStr as string)}
                  disabled={selectedDates.has('all')}
                  class="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span class="text-sm font-medium text-gray-700 {selectedDates.has('all') ? 'text-gray-400' : ''}">
                  {formatDateForDisplay(dateStr as string)}
                </span>
              </label>
            {/each}
          </div>
        {/if}
      </div>

      <div class="border border-gray-300 rounded-md">
        <button
          type="button"
          onclick={() => primaryDimensionDropdownOpen = !primaryDimensionDropdownOpen}
          class="flex items-center justify-between w-full text-left p-3 rounded-t-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 {primaryDimensionDropdownOpen ? 'rounded-b-none border-b border-gray-300' : 'rounded-b-md'}"
        >
          <div class="flex flex-col">
            <span class="text-sm font-medium text-gray-700">Primary Dimension</span>
            <span class="text-xs text-gray-500 mt-0.5">
              {primaryDimension === 'ticketType' ? 'By ticket type' : primaryDimension === 'gateway' ? 'By gateway' : 'By sales channel'}
            </span>
          </div>
          <svg
            class="w-5 h-5 text-gray-500 transform transition-transform {primaryDimensionDropdownOpen ? 'rotate-180' : ''}"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {#if primaryDimensionDropdownOpen}
          <div class="space-y-2 p-3 pt-2 border-t border-gray-200 bg-gray-50 rounded-b-md">
            <label class="flex items-center">
              <input
                type="radio"
                name="primary-dimension"
                value="ticketType"
                checked={primaryDimension === 'ticketType'}
                onchange={() => { primaryDimension = 'ticketType'; primaryDimensionDropdownOpen = false; }}
                class="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span class="text-sm font-medium text-gray-700">By ticket type</span>
            </label>
            <label class="flex items-center">
              <input
                type="radio"
                name="primary-dimension"
                value="gateway"
                checked={primaryDimension === 'gateway'}
                onchange={() => { primaryDimension = 'gateway'; primaryDimensionDropdownOpen = false; }}
                class="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span class="text-sm font-medium text-gray-700">By gateway</span>
            </label>
            <label class="flex items-center">
              <input
                type="radio"
                name="primary-dimension"
                value="salesChannel"
                checked={primaryDimension === 'salesChannel'}
                onchange={() => { primaryDimension = 'salesChannel'; primaryDimensionDropdownOpen = false; }}
                class="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span class="text-sm font-medium text-gray-700">By sales channel</span>
            </label>
          </div>
        {/if}
      </div>

      <div class="border border-gray-300 rounded-md">
        <button
          type="button"
          onclick={() => breakdownAccordionExpanded = !breakdownAccordionExpanded}
          class="flex items-center justify-between w-full text-left p-3 rounded-t-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 {breakdownAccordionExpanded ? 'rounded-b-none border-b border-gray-300' : 'rounded-b-md'}"
        >
          <div class="flex flex-col">
            <span class="text-sm font-medium text-gray-700">Breakdown</span>
          </div>
          <svg
            class="w-5 h-5 text-gray-500 transform transition-transform {breakdownAccordionExpanded ? 'rotate-180' : ''}"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {#if breakdownAccordionExpanded}
          <div class="space-y-2 p-3 pt-2 border-t border-gray-200 bg-gray-50 rounded-b-md">
            <label class="flex items-center">
              <input
                type="radio"
                name="breakdown"
                value="none"
                checked={breakdownType === 'none'}
                onchange={() => breakdownType = 'none'}
                class="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span class="text-sm font-medium text-gray-700">None</span>
            </label>
            {#if primaryDimension === 'ticketType'}
              <label class="flex items-center">
                <input
                  type="radio"
                  name="breakdown"
                  value="gateway"
                  checked={breakdownType === 'gateway'}
                  onchange={() => breakdownType = 'gateway'}
                  class="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span class="text-sm font-medium text-gray-700">Breakdown by gateway</span>
              </label>
              <label class="flex items-center">
                <input
                  type="radio"
                  name="breakdown"
                  value="salesChannel"
                  checked={breakdownType === 'salesChannel'}
                  onchange={() => breakdownType = 'salesChannel'}
                  class="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span class="text-sm font-medium text-gray-700">Breakdown by sales channel</span>
              </label>
            {:else if primaryDimension === 'gateway'}
              <label class="flex items-center">
                <input
                  type="radio"
                  name="breakdown"
                  value="ticketType"
                  checked={breakdownType === 'ticketType'}
                  onchange={() => breakdownType = 'ticketType'}
                  class="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span class="text-sm font-medium text-gray-700">Breakdown by ticket type</span>
              </label>
              <label class="flex items-center">
                <input
                  type="radio"
                  name="breakdown"
                  value="salesChannel"
                  checked={breakdownType === 'salesChannel'}
                  onchange={() => breakdownType = 'salesChannel'}
                  class="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span class="text-sm font-medium text-gray-700">Breakdown by sales channel</span>
              </label>
            {:else if primaryDimension === 'salesChannel'}
              <label class="flex items-center">
                <input
                  type="radio"
                  name="breakdown"
                  value="ticketType"
                  checked={breakdownType === 'ticketType'}
                  onchange={() => breakdownType = 'ticketType'}
                  class="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span class="text-sm font-medium text-gray-700">Breakdown by ticket type</span>
              </label>
              <label class="flex items-center">
                <input
                  type="radio"
                  name="breakdown"
                  value="gateway"
                  checked={breakdownType === 'gateway'}
                  onchange={() => breakdownType = 'gateway'}
                  class="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span class="text-sm font-medium text-gray-700">Breakdown by gateway</span>
              </label>
            {/if}
          </div>
        {/if}
      </div>
    </div>

    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            {#each getColumns() as column}
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                <div class="flex items-center gap-1">
                  <span>{column.label}</span>
                  {#if column.description}
                    <div 
                      class="relative inline-block group"
                      role="button"
                      tabindex="0"
                      onmouseenter={(e) => {
                        const tooltip = e.currentTarget.querySelector('.tooltip-content') as HTMLDivElement;
                        if (tooltip) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          tooltip.style.left = `${rect.left + rect.width / 2}px`;
                          tooltip.style.top = `${rect.top - 8}px`;
                        }
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4 text-gray-400 cursor-help hover:text-gray-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div
                        class="tooltip-content fixed opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 z-50 w-64 p-2 text-xs text-white bg-gray-900 rounded shadow-lg pointer-events-none whitespace-normal normal-case"
                        style="transform: translateX(-50%) translateY(-100%);"
                      >
                        {column.description}
                        <div
                          class="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1"
                        >
                          <div class="border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    </div>
                  {/if}
                </div>
              </th>
            {/each}
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#if primaryDimension === 'ticketType'}
            {#each reportData.rows as row}
              <tr class="hover:bg-gray-50">
                {#each getColumns() as column, colIndex}
                  <td class="px-6 py-4 whitespace-nowrap text-sm {colIndex === 0 ? 'font-medium text-gray-900' : 'text-gray-700'}">
                    {#if colIndex === 0}
                      <div class="flex items-center">
                        {#if breakdownType === 'gateway' && row.gatewayBreakdown && row.gatewayBreakdown.length > 0}
                          <button
                            type="button"
                            onclick={() => toggleRow(row.ticketType)}
                            class="mr-2 w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label={expandedRows.has(row.ticketType) ? 'Collapse' : 'Expand'}
                          >
                            {#if expandedRows.has(row.ticketType)}
                              <span class="text-lg font-semibold">−</span>
                            {:else}
                              <span class="text-lg font-semibold">+</span>
                            {/if}
                          </button>
                        {:else if breakdownType === 'salesChannel' && row.salesChannelBreakdown && row.salesChannelBreakdown.length > 0}
                          <button
                            type="button"
                            onclick={() => toggleRow(row.ticketType)}
                            class="mr-2 w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label={expandedRows.has(row.ticketType) ? 'Collapse' : 'Expand'}
                          >
                            {#if expandedRows.has(row.ticketType)}
                              <span class="text-lg font-semibold">−</span>
                            {:else}
                              <span class="text-lg font-semibold">+</span>
                            {/if}
                          </button>
                        {/if}
                        <span>{formatColumnValue(column, row)}</span>
                      </div>
                    {:else}
                      {formatColumnValue(column, row)}
                    {/if}
                  </td>
                {/each}
              </tr>
              {#if breakdownType === 'gateway' && row.gatewayBreakdown && row.gatewayBreakdown.length > 0 && expandedRows.has(row.ticketType)}
                {#each row.gatewayBreakdown as gatewayRow}
                  <tr class="bg-gray-50 hover:bg-gray-100">
                    {#each getColumns() as column, colIndex}
                      <td class="px-6 py-3 whitespace-nowrap text-sm text-gray-600 {colIndex === 0 ? 'pl-12' : ''}">
                        {#if colIndex === 0}
                          <span class="ml-2">{gatewayRow.gateway}</span>
                        {:else}
                          {formatColumnValue(column, gatewayRow)}
                        {/if}
                      </td>
                    {/each}
                  </tr>
                {/each}
              {:else if breakdownType === 'salesChannel' && row.salesChannelBreakdown && row.salesChannelBreakdown.length > 0 && expandedRows.has(row.ticketType)}
                {#each row.salesChannelBreakdown as salesChannelRow}
                  <tr class="bg-gray-50 hover:bg-gray-100">
                    {#each getColumns() as column, colIndex}
                      <td class="px-6 py-3 whitespace-nowrap text-sm text-gray-600 {colIndex === 0 ? 'pl-12' : ''}">
                        {#if colIndex === 0}
                          <span class="ml-2">{salesChannelRow.salesChannel}</span>
                        {:else}
                          {formatColumnValue(column, salesChannelRow)}
                        {/if}
                      </td>
                    {/each}
                  </tr>
                {/each}
              {/if}
            {/each}
          {:else if primaryDimension === 'gateway' && reportData.gatewayRows}
            {#each reportData.gatewayRows as row}
              <tr class="hover:bg-gray-50">
                {#each getColumns() as column, colIndex}
                  <td class="px-6 py-4 whitespace-nowrap text-sm {colIndex === 0 ? 'font-medium text-gray-900' : 'text-gray-700'}">
                    {#if colIndex === 0}
                      <div class="flex items-center">
                        {#if breakdownType === 'ticketType' && row.ticketTypeBreakdown && row.ticketTypeBreakdown.length > 0}
                          <button
                            type="button"
                            onclick={() => toggleRow(row.gateway)}
                            class="mr-2 w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label={expandedRows.has(row.gateway) ? 'Collapse' : 'Expand'}
                          >
                            {#if expandedRows.has(row.gateway)}
                              <span class="text-lg font-semibold">−</span>
                            {:else}
                              <span class="text-lg font-semibold">+</span>
                            {/if}
                          </button>
                        {:else if breakdownType === 'salesChannel' && row.salesChannelBreakdown && row.salesChannelBreakdown.length > 0}
                          <button
                            type="button"
                            onclick={() => toggleRow(row.gateway)}
                            class="mr-2 w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label={expandedRows.has(row.gateway) ? 'Collapse' : 'Expand'}
                          >
                            {#if expandedRows.has(row.gateway)}
                              <span class="text-lg font-semibold">−</span>
                            {:else}
                              <span class="text-lg font-semibold">+</span>
                            {/if}
                          </button>
                        {/if}
                        <span>{formatColumnValue(column, row)}</span>
                      </div>
                    {:else}
                      {formatColumnValue(column, row)}
                    {/if}
                  </td>
                {/each}
              </tr>
              {#if breakdownType === 'ticketType' && row.ticketTypeBreakdown && row.ticketTypeBreakdown.length > 0 && expandedRows.has(row.gateway)}
                {#each row.ticketTypeBreakdown as ticketTypeRow}
                  <tr class="bg-gray-50 hover:bg-gray-100">
                    {#each getColumns() as column, colIndex}
                      <td class="px-6 py-3 whitespace-nowrap text-sm text-gray-600 {colIndex === 0 ? 'pl-12' : ''}">
                        {#if colIndex === 0}
                          <span class="ml-2">{ticketTypeRow.ticketType}</span>
                        {:else}
                          {formatColumnValue(column, ticketTypeRow)}
                        {/if}
                      </td>
                    {/each}
                  </tr>
                {/each}
              {:else if breakdownType === 'salesChannel' && row.salesChannelBreakdown && row.salesChannelBreakdown.length > 0 && expandedRows.has(row.gateway)}
                {#each row.salesChannelBreakdown as salesChannelRow}
                  <tr class="bg-gray-50 hover:bg-gray-100">
                    {#each getColumns() as column, colIndex}
                      <td class="px-6 py-3 whitespace-nowrap text-sm text-gray-600 {colIndex === 0 ? 'pl-12' : ''}">
                        {#if colIndex === 0}
                          <span class="ml-2">{salesChannelRow.salesChannel}</span>
                        {:else}
                          {formatColumnValue(column, salesChannelRow)}
                        {/if}
                      </td>
                    {/each}
                  </tr>
                {/each}
              {/if}
            {/each}
          {:else if primaryDimension === 'salesChannel' && reportData.salesChannelRows}
            {#each reportData.salesChannelRows as row}
              <tr class="hover:bg-gray-50">
                {#each getColumns() as column, colIndex}
                  <td class="px-6 py-4 whitespace-nowrap text-sm {colIndex === 0 ? 'font-medium text-gray-900' : 'text-gray-700'}">
                    {#if colIndex === 0}
                      <div class="flex items-center">
                        {#if breakdownType === 'ticketType' && row.ticketTypeBreakdown && row.ticketTypeBreakdown.length > 0}
                          <button
                            type="button"
                            onclick={() => toggleRow(row.salesChannel)}
                            class="mr-2 w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label={expandedRows.has(row.salesChannel) ? 'Collapse' : 'Expand'}
                          >
                            {#if expandedRows.has(row.salesChannel)}
                              <span class="text-lg font-semibold">−</span>
                            {:else}
                              <span class="text-lg font-semibold">+</span>
                            {/if}
                          </button>
                        {:else if breakdownType === 'gateway' && row.gatewayBreakdown && row.gatewayBreakdown.length > 0}
                          <button
                            type="button"
                            onclick={() => toggleRow(row.salesChannel)}
                            class="mr-2 w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label={expandedRows.has(row.salesChannel) ? 'Collapse' : 'Expand'}
                          >
                            {#if expandedRows.has(row.salesChannel)}
                              <span class="text-lg font-semibold">−</span>
                            {:else}
                              <span class="text-lg font-semibold">+</span>
                            {/if}
                          </button>
                        {/if}
                        <span>{formatColumnValue(column, row)}</span>
                      </div>
                    {:else}
                      {formatColumnValue(column, row)}
                    {/if}
                  </td>
                {/each}
              </tr>
              {#if breakdownType === 'ticketType' && row.ticketTypeBreakdown && row.ticketTypeBreakdown.length > 0 && expandedRows.has(row.salesChannel)}
                {#each row.ticketTypeBreakdown as ticketTypeRow}
                  <tr class="bg-gray-50 hover:bg-gray-100">
                    {#each getColumns() as column, colIndex}
                      <td class="px-6 py-3 whitespace-nowrap text-sm text-gray-600 {colIndex === 0 ? 'pl-12' : ''}">
                        {#if colIndex === 0}
                          <span class="ml-2">{ticketTypeRow.ticketType}</span>
                        {:else}
                          {formatColumnValue(column, ticketTypeRow)}
                        {/if}
                      </td>
                    {/each}
                  </tr>
                {/each}
              {:else if breakdownType === 'gateway' && row.gatewayBreakdown && row.gatewayBreakdown.length > 0 && expandedRows.has(row.salesChannel)}
                {#each row.gatewayBreakdown as gatewayRow}
                  <tr class="bg-gray-50 hover:bg-gray-100">
                    {#each getColumns() as column, colIndex}
                      <td class="px-6 py-3 whitespace-nowrap text-sm text-gray-600 {colIndex === 0 ? 'pl-12' : ''}">
                        {#if colIndex === 0}
                          <span class="ml-2">{gatewayRow.gateway}</span>
                        {:else}
                          {formatColumnValue(column, gatewayRow)}
                        {/if}
                      </td>
                    {/each}
                  </tr>
                {/each}
              {/if}
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>
{/if}

