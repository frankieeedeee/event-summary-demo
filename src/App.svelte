<script lang="ts">
  import CsvUpload from './components/CsvUpload.svelte';
  import ReportTable from './components/ReportTable.svelte';
  import { generateReport } from './lib/reportGenerator';
  import type { ReportData, AttendeeRow } from './lib/types';

  let reportData: ReportData | null = null;

  function handleDataParsed(data: { validAttendees: AttendeeRow[]; cancelledAttendees: AttendeeRow[] }) {
    reportData = generateReport(data.validAttendees, data.cancelledAttendees);
  }
</script>

<div class="min-h-screen bg-gray-50 py-8 px-4">
  <div class="w-full mx-auto">
    <div class="flex justify-between items-start mb-8">
      <div class="flex-1">
        <h1 class="text-3xl font-bold text-gray-900 mb-1">
          Event Sales Summary
        </h1>
        <p class="text-lg text-gray-600 mb-2">
          Confidential Beta Report and Interactive Preview - Do not share or distribute.
        </p>
        <p class="text-sm text-gray-600 max-w-3xl">
          Your feedback matters! Please share your thoughts with us as you use this event sales summary, as we look to incorporate this functionality natively within the platform.
        </p>
      </div>
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
      >
        Share Feedback
      </button>
    </div>

    <CsvUpload onDataParsed={handleDataParsed} />
    {#if reportData}
      <ReportTable {reportData} />
    {/if}
  </div>
</div>

