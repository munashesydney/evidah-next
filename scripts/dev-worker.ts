/**
 * Local development worker script
 * Polls for pending chat jobs and processes them
 * 
 * Usage: npm run dev:worker
 * 
 * This script should be run alongside `npm run dev` during local development
 */

const WORKER_ENDPOINT = process.env.WORKER_ENDPOINT || 'http://localhost:3002/api/workers/chat-processor';
const POLL_INTERVAL = 10000; // 10 seconds

async function processJobs() {
  try {
    console.log(`[DEV WORKER] Polling ${WORKER_ENDPOINT}...`);
    
    const response = await fetch(WORKER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[DEV WORKER] Error: ${response.status} - ${errorText}`);
      return;
    }

    const result = await response.json();
    
    if (result.processed > 0) {
      console.log(`[DEV WORKER] ✅ Processed ${result.processed} jobs (${result.completed} completed, ${result.failed} failed)`);
      if (result.errors && result.errors.length > 0) {
        console.error(`[DEV WORKER] Errors:`, result.errors);
      }
    } else {
      console.log(`[DEV WORKER] No pending jobs`);
    }
  } catch (error) {
    console.error(`[DEV WORKER] Fatal error:`, error);
  }
}

// Start polling
console.log(`[DEV WORKER] Starting local worker...`);
console.log(`[DEV WORKER] Endpoint: ${WORKER_ENDPOINT}`);
console.log(`[DEV WORKER] Poll interval: ${POLL_INTERVAL}ms`);
console.log(`[DEV WORKER] Press Ctrl+C to stop\n`);

// Process immediately, then set up interval
processJobs();
const interval = setInterval(processJobs, POLL_INTERVAL);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[DEV WORKER] Shutting down...');
  clearInterval(interval);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[DEV WORKER] Shutting down...');
  clearInterval(interval);
  process.exit(0);
});

