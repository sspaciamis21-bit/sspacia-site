import cron from 'node-cron';
import { runDailyAgreementAlertEmails } from '@/lib/email-automation';

let isSchedulerStarted = false;

/**
 * Starts the cron scheduler for daily automated tasks.
 * Called once from instrumentation.ts when the Next.js server boots.
 * 
 * Schedule: Every day at 9:00 AM IST (3:30 AM UTC)
 * Task: Send agreement & lock-in expiration alert emails to cm@sspacia.com
 */
export function startCronScheduler() {
  // Prevent duplicate scheduling (e.g., hot-reload in dev mode)
  if (isSchedulerStarted) {
    console.log('[CRON] Scheduler already running, skipping duplicate start.');
    return;
  }

  isSchedulerStarted = true;

  // ── DAILY 9:00 AM IST — Agreement & Lock-in Alert Emails ──
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

  console.log('[CRON] ✅ Scheduler started — Daily agreement alert emails scheduled at 9:00 AM IST (cm@sspacia.com)');
}
