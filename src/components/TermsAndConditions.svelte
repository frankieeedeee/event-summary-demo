<script lang="ts">
  const { onAgree } = $props<{
    onAgree: () => void;
  }>();
</script>

<div class="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
  <h1 class="text-2xl font-bold text-gray-900 mb-4">
    Welcome to Event Sales Summary
  </h1>
  <div class="prose prose-sm max-w-none mb-6 text-gray-700 text-sm">
    <h2 class="text-lg font-semibold text-gray-900 mb-2">Terms and Conditions</h2>
    <p class="mb-2">
      By using this Beta Report Interactive Preview, you agree to the following terms:
    </p>
    <ul class="list-disc pl-5 mb-3 space-y-1.5 text-sm">
      <li>This is a confidential beta report and should not be shared or distributed outside of authorized personnel.</li>
      <li>This software is not governed by the standard Humanitix Terms and Conditions or privacy policy. Any use of this software is at your own risk.</li>
      <li>The data and reports generated are for internal use only and are subject to your organization's data privacy policies.</li>
      <li>This is a preview version and may contain bugs or inaccuracies. Use at your own discretion.</li>
      <li>Your feedback is valuable and will help us improve the platform. We encourage you to share your thoughts and suggestions.</li>
      <li>Humanitix reserves the right to modify or discontinue this beta report at any time without notice.</li>
    </ul>
    <p class="text-xs text-gray-600">
      By clicking "I Agree" below, you acknowledge that you have read, understood, and agree to be bound by these terms and conditions.
    </p>
  </div>
  <button
    type="button"
    onclick={onAgree}
    class="w-full px-4 py-2 text-sm bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
  >
    I Agree
  </button>
</div>

