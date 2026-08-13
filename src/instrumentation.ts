export async function register() {
  // Only start the cron job on the Node.js server runtime
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startPriceUpdateCron } = await import('@/lib/cron');
    startPriceUpdateCron();
  }
}