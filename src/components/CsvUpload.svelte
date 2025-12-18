<script lang="ts">
  import { parseCSVFile } from '../lib/csvParser';
  import type { AttendeeRow } from '../lib/types';

  const SESSION_STORAGE_KEY = 'hx-event-summary-report-data';
  const DATA_VERSION = 1;

  interface StoredData {
    version: number;
    validAttendees: AttendeeRow[];
    cancelledAttendees: AttendeeRow[];
  }

  let {
    onDataParsed,
  }: {
    onDataParsed?: (data: { validAttendees: AttendeeRow[]; cancelledAttendees: AttendeeRow[] }) => void;
  } = $props();

  let validFile = $state<File | null>(null);
  let cancelledFile = $state<File | null>(null);
  let error = $state<string | null>(null);
  let processing = $state(false);
  let uploadPanelExpanded = $state(true);
  let validAttendees = $state<AttendeeRow[]>([]);
  let cancelledAttendees = $state<AttendeeRow[]>([]);

  // Load from session storage on mount
  $effect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        try {
          const parsed: StoredData = JSON.parse(stored);

          // Check version - if outdated, clear storage and force re-upload
          if (parsed.version < DATA_VERSION) {
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
          } else if (parsed.validAttendees && parsed.cancelledAttendees) {
            // eventDateTime is now stored as a string, so no conversion needed
            // Call callback with stored data
            validAttendees = parsed.validAttendees;
            cancelledAttendees = parsed.cancelledAttendees;
            onDataParsed?.({
              validAttendees: parsed.validAttendees,
              cancelledAttendees: parsed.cancelledAttendees,
            });
            uploadPanelExpanded = false; // Collapse if data is loaded
          }
        } catch (e) {
          // Invalid data, clear it
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }
    }
  });

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

    try {
      const parsedValidAttendees = await parseCSVFile(validFile, 'Valid');
      const parsedCancelledAttendees = await parseCSVFile(cancelledFile, 'Cancelled');

      // Combine both CSVs
      const combinedAttendees = [...parsedValidAttendees, ...parsedCancelledAttendees];

      // Log first 100 rows of combined result
      console.log('Combined CSV result (first 100 rows):', combinedAttendees.slice(0, 100));

      // Store parsed attendee data (result of csvParser) in session storage with version
      if (typeof window !== 'undefined') {
        const storedData: StoredData = {
          version: DATA_VERSION,
          validAttendees: parsedValidAttendees,
          cancelledAttendees: parsedCancelledAttendees,
        };
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(storedData));
      }

      // Store attendees for display
      validAttendees = parsedValidAttendees;
      cancelledAttendees = parsedCancelledAttendees;

      // Call callback with parsed data
      onDataParsed?.({
        validAttendees: parsedValidAttendees,
        cancelledAttendees: parsedCancelledAttendees,
      });

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
    error = null;
    validAttendees = [];
    cancelledAttendees = [];
    // Clear session storage when starting new upload
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }

  let eventName = $derived(
    validAttendees.length > 0
      ? validAttendees[0].eventName
      : cancelledAttendees.length > 0
        ? cancelledAttendees[0].eventName
        : ''
  );
</script>

<div class="bg-white rounded-lg shadow-md p-6 mb-6">
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-xl font-semibold text-gray-800">
      Upload Event Data
      {#if !uploadPanelExpanded}
        <span class="ml-2 text-sm font-normal text-green-600">Done</span>
      {/if}
    </h2>
    {#if !uploadPanelExpanded}
      <button
        type="button"
        onclick={handleUploadAgain}
        class="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Upload again
      </button>
    {/if}
  </div>

  {#if !uploadPanelExpanded && (validAttendees.length > 0 || cancelledAttendees.length > 0)}
    <div class="mt-4">
      <h3 class="text-sm font-semibold text-gray-800 mb-2">
        Detected event information
      </h3>
      <div class="space-y-1">
        {#if eventName}
          <div>
            <span class="text-sm font-medium text-gray-700">Event Name:</span>
            <span class="ml-2 text-sm text-gray-900">{eventName}</span>
          </div>
        {/if}
        <div>
          <span class="text-sm font-medium text-gray-700">Valid Tickets:</span>
          <span class="ml-2 text-sm text-gray-900">{validAttendees.length}</span>
        </div>
        <div>
          <span class="text-sm font-medium text-gray-700">Cancelled Tickets:</span>
          <span class="ml-2 text-sm text-gray-900">{cancelledAttendees.length}</span>
        </div>
      </div>
    </div>
  {/if}

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

