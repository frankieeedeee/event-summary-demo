<script lang="ts">
  import type { ReportData } from '../lib/types';

  type PrimaryDimension = 'ticketType' | 'gateway';

  const { reportData } = $props<{ reportData: ReportData | null }>();

  let primaryDimension = $state<PrimaryDimension>('ticketType');
  let breakdownByGateway = $state(false);
  let breakdownByTicketType = $state(false);
  let expandedRows = $state(new Set<string>());

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
  $effect(() => {
    if (primaryDimension === 'ticketType') {
      breakdownByTicketType = false;
      expandedRows = new Set();
    } else {
      breakdownByGateway = false;
      expandedRows = new Set();
    }
  });
</script>

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

