const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * GET /users/:id/payments
 * Get payment history for a user with monthly summary
 */
const getPayments = async (req, res) => {
  const { id } = req.params;
  const { year } = req.query;

  try {
    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const where = { user_id: parseInt(id) };
    if (year && !isNaN(parseInt(year))) where.year = parseInt(year);

    const payments = await prisma.payment.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { created_at: 'desc' }],
    });

    // Build monthly summary grouped by year+month
    const monthlyMap = {};
    for (const p of payments) {
      const key = `${p.year}-${String(p.month).padStart(2, '0')}`;
      if (!monthlyMap[key]) {
        monthlyMap[key] = {
          key,
          month: p.month,
          year: p.year,
          month_name: MONTH_NAMES[p.month - 1],
          amount_due: parseFloat(p.amount_due),
          total_paid: 0,
          payments: [],
        };
      }
      monthlyMap[key].total_paid += parseFloat(p.amount_paid);
      monthlyMap[key].payments.push({
        id: p.id,
        amount_paid: parseFloat(p.amount_paid),
        amount_due: parseFloat(p.amount_due),
        balance_before: parseFloat(p.balance_before),
        balance_after: parseFloat(p.balance_after),
        notes: p.notes,
        created_at: p.created_at,
      });
    }

    const monthlySummary = Object.values(monthlyMap).map((m) => ({
      ...m,
      remaining: m.amount_due - m.total_paid,
      is_full_paid: m.total_paid >= m.amount_due,
    }));

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        monthly_fee: parseFloat(user.monthly_fee),
        balance: parseFloat(user.balance),
        is_paid: user.is_paid,
      },
      payments: payments.map((p) => ({
        id: p.id,
        amount_paid: parseFloat(p.amount_paid),
        amount_due: parseFloat(p.amount_due),
        balance_before: parseFloat(p.balance_before),
        balance_after: parseFloat(p.balance_after),
        month: p.month,
        year: p.year,
        month_name: MONTH_NAMES[p.month - 1],
        notes: p.notes,
        created_at: p.created_at,
      })),
      monthly_summary: monthlySummary,
    });
  } catch (err) {
    console.error('GetPayments error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching payments.' });
  }
};

/**
 * DELETE /users/:id/payments/:paymentId
 * Delete a specific payment record and restore user balance
 */
const deletePayment = async (req, res) => {
  const { id, paymentId } = req.params;

  try {
    const payment = await prisma.payment.findFirst({
      where: { id: parseInt(paymentId), user_id: parseInt(id) },
    });

    if (!payment) return res.status(404).json({ success: false, message: 'Payment record not found.' });

    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    const restoredBalance = parseFloat(user.balance) + parseFloat(payment.amount_paid);

    await prisma.$transaction([
      prisma.payment.delete({ where: { id: parseInt(paymentId) } }),
      prisma.user.update({
        where: { id: parseInt(id) },
        data: {
          balance: restoredBalance,
          is_paid: restoredBalance <= 0,
        },
      }),
    ]);

    const updatedUser = await prisma.user.findUnique({ where: { id: parseInt(id) } });

    res.json({
      success: true,
      message: `Payment of ₱${parseFloat(payment.amount_paid).toFixed(2)} deleted and balance restored.`,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        monthly_fee: parseFloat(updatedUser.monthly_fee),
        balance: parseFloat(updatedUser.balance),
        is_paid: updatedUser.is_paid,
      },
    });
  } catch (err) {
    console.error('DeletePayment error:', err);
    res.status(500).json({ success: false, message: 'Server error deleting payment.' });
  }
};

module.exports = { getPayments, deletePayment };
