const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Monthly reset: add monthly_fee to each active user's balance and reset is_paid.
 * If accumulated balance <= 0 (overpaid credit), keep is_paid = true.
 * Cron schedule: '0 0 1 * *' = At 00:00 on the 1st of every month
 */
const resetMonthlyPayments = async () => {
  console.log('[CRON] Running monthly payment reset...');
  try {
    const users = await prisma.user.findMany({ where: { is_active: true } });

    let updated = 0;
    for (const user of users) {
      const newBalance = parseFloat(user.balance) + parseFloat(user.monthly_fee);
      const isPaid = newBalance <= 0;

      await prisma.user.update({
        where: { id: user.id },
        data: { balance: newBalance, is_paid: isPaid },
      });
      updated++;
    }

    console.log(`[CRON] Monthly reset complete. ${updated} users updated.`);
  } catch (err) {
    console.error('[CRON] Error resetting payments:', err);
  }
};

/**
 * Start all scheduled cron jobs
 */
const startCronJobs = () => {
  cron.schedule('0 0 1 * *', resetMonthlyPayments, {
    timezone: 'Asia/Manila',
    name: 'monthly-payment-reset',
  });
  console.log('[CRON] Monthly payment reset job scheduled (1st of every month at 00:00 PHT)');
};

module.exports = { startCronJobs, resetMonthlyPayments };
