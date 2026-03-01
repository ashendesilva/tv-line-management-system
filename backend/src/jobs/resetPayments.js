const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Reset all users' is_paid status to false at the start of every new month.
 * Cron schedule: '0 0 1 * *' = At 00:00 on the 1st of every month
 */
const resetMonthlyPayments = async () => {
  console.log('[CRON] Running monthly payment reset...');
  try {
    const result = await prisma.user.updateMany({
      where: { is_active: true },
      data: { is_paid: false },
    });
    console.log(`[CRON] Payment reset complete. ${result.count} users updated.`);
  } catch (err) {
    console.error('[CRON] Error resetting payments:', err);
  }
};

/**
 * Start all scheduled cron jobs
 */
const startCronJobs = () => {
  // Reset payments on the 1st of every month at midnight
  cron.schedule('0 0 1 * *', resetMonthlyPayments, {
    timezone: 'Asia/Manila',
    name: 'monthly-payment-reset',
  });

  console.log('[CRON] Monthly payment reset job scheduled (1st of every month at 00:00 PHT)');
};

module.exports = { startCronJobs, resetMonthlyPayments };
