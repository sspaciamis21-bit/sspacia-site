import cron from 'node-cron';
import { runDailyAgreementAlertEmails } from '@/lib/email-automation';
import { autoDispatchIfLastDay } from '@/lib/auto-dispatch';

let isSchedulerStarted = false;

/**
 * Starts the cron scheduler for daily automated tasks.
 * Called once from instrumentation.ts when the Next.js server boots.
 * 
 * Schedules:
 * 1. Daily 12:00 AM (00:00) IST — Month-End Auto Invoice Dispatch for Active Clients
 * 2. Daily 9:00 AM IST — Agreement & Lock-In Expiry Alert Emails to cm@sspacia.com
 */
export function startCronScheduler() {
  // Prevent duplicate scheduling (e.g., hot-reload in dev mode)
  if (isSchedulerStarted) {
    console.log('[CRON] Scheduler already running, skipping duplicate start.');
    return;
  }

  isSchedulerStarted = true;

  // ── 1. DAILY 12:00 AM IST (Midnight) — Month-End Auto Invoice Dispatch ──
  // Cron: '0 0 * * *' = 12:00 AM Midnight IST
  cron.schedule('0 0 * * *', async () => {
    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    console.log(`[CRON] ⏰ Midnight (12:00 AM IST) invoice auto-dispatch check triggered at ${timestamp}`);

    try {
      const result = await autoDispatchIfLastDay();
      if (result.dispatched) {
        console.log(`[CRON] 📄 Month-End Invoices Auto-Generated: ${result.count} entries created (${result.message})`);
      } else {
        console.log(`[CRON] ℹ️ Auto-dispatch status: ${result.message}`);
      }
    } catch (error: any) {
      console.error(`[CRON] ❌ Failed to run midnight invoice auto-dispatch:`, error?.message || error);
    }
  }, {
    timezone: 'Asia/Kolkata',
  });

  // ── 2. DAILY 9:00 AM IST — Agreement & Lock-in Alert Emails ──
  // Cron: minute(30) hour(3) = 3:30 AM UTC = 9:00 AM IST
  cron.schedule('30 3 * * *', async () => {
    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    console.log(`[CRON] ⏰ Daily agreement alert email job triggered at ${timestamp}`);

    try {
      const result = await runDailyAgreementAlertEmails('cm@sspacia.com');
      console.log(`[CRON] ✅ Daily alert emails sent successfully — ${result.sentCount} center email(s) dispatched.`);
    } catch (error: any) {
      console.error(`[CRON] ❌ Failed to send daily alert emails:`, error?.message || error);
    }
  }, {
    timezone: 'Asia/Kolkata',
  });

  console.log('[CRON] ✅ Scheduler started:');
  console.log('       • 12:00 AM IST — Month-End Invoice Auto-Dispatch');
  console.log('       • 9:00 AM IST — Daily Agreement & Lock-In Alert Emails');
}
