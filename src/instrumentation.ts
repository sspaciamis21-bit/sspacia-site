/**
 * Next.js Instrumentation Hook
 * Runs once when the server starts up.
 * Used to schedule daily cron jobs like agreement alert emails.
 */
export async function register() {
  // Only run on the server (not during build or on the client)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const mod = await import('./lib/cron-scheduler');
    mod.startCronScheduler();
  }
}
