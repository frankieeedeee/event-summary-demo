<script lang="ts">
  import { parseCSVFile } from './lib/csvParser';
  import { generateReport } from './lib/reportGenerator';
  import type { ReportData, AttendeeRow } from './lib/types';

  type PrimaryDimension = 'ticketType' | 'gateway';

  const SESSION_STORAGE_KEY = 'hx-event-summary-report-data';
  const DATA_VERSION = 1;

  interface StoredData {
    version: number;
    validAttendees: AttendeeRow[];
    cancelledAttendees: AttendeeRow[];
  }

  let validFile: File | null = null;
  let cancelledFile: File | null = null;
  let reportData: ReportData | null = null;
  let error: string | null = null;
  let processing = false;
  let primaryDimension: PrimaryDimension = 'ticketType';
  let breakdownByGateway = false;
  let breakdownByTicketType = false;
  let expandedRows = new Set<string>();
  let uploadPanelExpanded = true;

  // Load from session storage on mount
  if (typeof window !== 'undefined') {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      try {
        const parsed: StoredData = JSON.parse(stored);
        
        // Check version - if outdated, clear storage and force re-upload
        if (parsed.version < DATA_VERSION) {
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
        } else if (parsed.validAttendees && parsed.cancelledAttendees) {
          // Regenerate reportData from stored attendee data
          reportData = generateReport(parsed.validAttendees, parsed.cancelledAttendees);
          uploadPanelExpanded = false; // Collapse if data is loaded
        }
      } catch (e) {
        // Invalid data, clear it
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }
  }

  async function handleValidFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      validFile = file;
      await processFiles();
    }
  }

  async function handleCancelledFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      cancelledFile = file;
      await processFiles();
    }
  }

  async function processFiles() {
    if (!validFile || !cancelledFile) {
      return;
    }

    processing = true;
    error = null;
    reportData = null;

    try {
      const validAttendees = await parseCSVFile(validFile, 'Valid');
      const cancelledAttendees = await parseCSVFile(cancelledFile, 'Cancelled');
      
      // Combine both CSVs
      const combinedAttendees = [...validAttendees, ...cancelledAttendees];
      
      // Log first 100 rows of combined result
      console.log('Combined CSV result (first 100 rows):', combinedAttendees.slice(0, 100));
      
      reportData = generateReport(validAttendees, cancelledAttendees);
      
      // Store parsed attendee data (result of csvParser) in session storage with version
      if (typeof window !== 'undefined') {
        const storedData: StoredData = {
          version: DATA_VERSION,
          validAttendees,
          cancelledAttendees,
        };
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(storedData));
      }
      
      // Clear raw data from memory (validAttendees and cancelledAttendees are now stored)
      // Collapse upload panel
      uploadPanelExpanded = false;
    } catch (err) {
      error = err instanceof Error ? err.message : 'An unknown error occurred';
    } finally {
      processing = false;
    }
  }

  function handleUploadAgain() {
    uploadPanelExpanded = true;
    validFile = null;
    cancelledFile = null;
    reportData = null;
    error = null;
    // Clear session storage when starting new upload
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
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

  // When primary dimension changes, disable and uncheck the corresponding breakdown, and clear expanded rows
  $: if (primaryDimension === 'ticketType') {
    breakdownByTicketType = false;
    expandedRows = new Set();
  } else {
    breakdownByGateway = false;
    expandedRows = new Set();
  }
</script>

<div class="min-h-screen bg-gray-50 py-8 px-4">
  <div class="max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold text-gray-900 mb-8">
      Humanitix Event Summary Reporter
    </h1>

    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-gray-800">
          Upload CSV Files
          {#if reportData && !uploadPanelExpanded}
            <span class="ml-2 text-sm font-normal text-green-600">Done</span>
          {/if}
        </h2>
        {#if reportData && !uploadPanelExpanded}
          <button
            type="button"
            onclick={handleUploadAgain}
            class="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Upload again
          </button>
        {/if}
      </div>

      {#if uploadPanelExpanded}
        <div class="space-y-4">
          <div>
            <label
              for="valid-file"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              Valid Attendees Report
            </label>
            <input
              id="valid-file"
              type="file"
              accept=".csv"
              onchange={handleValidFileChange}
              class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {#if validFile}
              <p class="mt-2 text-sm text-gray-600">
                Selected: {validFile.name}
              </p>
            {/if}
          </div>

          <div>
            <label
              for="cancelled-file"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              Cancelled Attendees Report
            </label>
            <input
              id="cancelled-file"
              type="file"
              accept=".csv"
              onchange={handleCancelledFileChange}
              class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {#if cancelledFile}
              <p class="mt-2 text-sm text-gray-600">
                Selected: {cancelledFile.name}
              </p>
            {/if}
          </div>
        </div>

        {#if processing}
          <div class="mt-4 text-sm text-gray-600">Processing files...</div>
        {/if}

        {#if error}
          <div class="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p class="text-sm text-red-800">{error}</p>
          </div>
        {/if}
      {/if}
    </div>

    {#if reportData}
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-2">
          Ticket sales summary report
        </h2>
        <p class="text-lg text-gray-700 mb-4">{reportData.eventName}</p>

        <div class="mb-4 space-y-3">
          <div>
            <label for="primary-dimension" class="block text-sm font-medium text-gray-700 mb-2">
              Primary Dimension
            </label>
            <select
              id="primary-dimension"
              bind:value={primaryDimension}
              class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="ticketType">By ticket type</option>
              <option value="gateway">By gateway</option>
            </select>
          </div>

          <div class="space-y-2">
            <label class="flex items-center">
              <input
                type="checkbox"
                bind:checked={breakdownByGateway}
                disabled={primaryDimension === 'gateway'}
                class="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span class="text-sm font-medium text-gray-700 {primaryDimension === 'gateway' ? 'text-gray-400' : ''}">
                Breakdown by gateway
              </span>
            </label>

            <label class="flex items-center">
              <input
                type="checkbox"
                bind:checked={breakdownByTicketType}
                disabled={primaryDimension === 'ticketType'}
                class="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span class="text-sm font-medium text-gray-700 {primaryDimension === 'ticketType' ? 'text-gray-400' : ''}">
                Breakdown by ticket type
              </span>
            </label>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {primaryDimension === 'ticketType' ? 'Ticket Type' : 'Gateway'}
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Paid
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Valid Tickets
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Cancelled Tickets
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#if primaryDimension === 'ticketType'}
                {#each reportData.rows as row}
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div class="flex items-center">
                        {#if breakdownByGateway && row.gatewayBreakdown && row.gatewayBreakdown.length > 0}
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
                        <span>{row.ticketType}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {formatCurrency(row.totalPaid)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {row.validCount}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {row.cancelledCount}
                    </td>
                  </tr>
                  {#if breakdownByGateway && row.gatewayBreakdown && row.gatewayBreakdown.length > 0 && expandedRows.has(row.ticketType)}
                    {#each row.gatewayBreakdown as gatewayRow}
                      <tr class="bg-gray-50 hover:bg-gray-100">
                        <td class="px-6 py-3 whitespace-nowrap text-sm text-gray-600 pl-12">
                          <span class="ml-2">{gatewayRow.gateway}</span>
                        </td>
                        <td class="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                          {formatCurrency(gatewayRow.totalPaid)}
                        </td>
                        <td class="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                          {gatewayRow.validCount}
                        </td>
                        <td class="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                          {gatewayRow.cancelledCount}
                        </td>
                      </tr>
                    {/each}
                  {/if}
                {/each}
              {:else if primaryDimension === 'gateway' && reportData.gatewayRows}
                {#each reportData.gatewayRows as row}
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div class="flex items-center">
                        {#if breakdownByTicketType && row.ticketTypeBreakdown && row.ticketTypeBreakdown.length > 0}
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
                        <span>{row.gateway}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {formatCurrency(row.totalPaid)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {row.validCount}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {row.cancelledCount}
                    </td>
                  </tr>
                  {#if breakdownByTicketType && row.ticketTypeBreakdown && row.ticketTypeBreakdown.length > 0 && expandedRows.has(row.gateway)}
                    {#each row.ticketTypeBreakdown as ticketTypeRow}
                      <tr class="bg-gray-50 hover:bg-gray-100">
                        <td class="px-6 py-3 whitespace-nowrap text-sm text-gray-600 pl-12">
                          <span class="ml-2">{ticketTypeRow.ticketType}</span>
                        </td>
                        <td class="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                          {formatCurrency(ticketTypeRow.totalPaid)}
                        </td>
                        <td class="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                          {ticketTypeRow.validCount}
                        </td>
                        <td class="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                          {ticketTypeRow.cancelledCount}
                        </td>
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
  </div>
</div>

