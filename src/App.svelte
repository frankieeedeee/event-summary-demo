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
  <div class="max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold text-gray-900 mb-8">
      Humanitix Event Summary Reporter
    </h1>

    <CsvUpload onDataParsed={handleDataParsed} />
    {#if reportData}
      <ReportTable {reportData} />
    {/if}
  </div>
</div>

