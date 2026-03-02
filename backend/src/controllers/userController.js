const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');

const prisma = new PrismaClient();

/** Fixed monthly subscription fee for all customers (LKR) */
const MONTHLY_FEE = 500;

/**
 * Helper: Format user response with computed status
 */
const formatUser = (user) => {
  const bal = parseFloat(user.balance || 0);
  const fee = parseFloat(user.monthly_fee || MONTHLY_FEE);

  let payment_status;
  if (bal <= 0) payment_status = 'paid';
  else if (bal < fee) payment_status = 'partial';
  else payment_status = 'unpaid';

  return {
    ...user,
    monthly_fee: fee,
    balance: bal,
    last_payment_date: user.last_payment_date
      ? user.last_payment_date.toISOString().split('T')[0]
      : null,
    payment_status,
    is_paid: bal <= 0,
  };
};

/**
 * POST /users
 * Create a new user
 */
const createUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { name, address, monthly_payment_day, is_active, initial_balance } = req.body;

  const startingBalance = initial_balance !== undefined ? parseFloat(initial_balance) : MONTHLY_FEE;

  try {
    const user = await prisma.user.create({
      data: {
        name,
        address,
        monthly_payment_day: parseInt(monthly_payment_day),
        monthly_fee: MONTHLY_FEE,
        balance: startingBalance,
        is_active: is_active !== undefined ? Boolean(is_active) : true,
        is_paid: startingBalance <= 0,
      },
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully.',
      user: formatUser(user),
    });
  } catch (err) {
    console.error('CreateUser error:', err);
    res.status(500).json({ success: false, message: 'Server error creating user.' });
  }
};

/**
 * GET /users
 * Get all users with optional search & filter
 */
const getUsers = async (req, res) => {
  const { search, status, paymentDay, active } = req.query;
  const where = {};

  if (search && search.trim()) {
    where.OR = [
      { name: { contains: search.trim() } },
      { address: { contains: search.trim() } },
    ];
  }
  if (status === 'paid') where.balance = { lte: 0 };
  else if (status === 'partial') where.AND = [{ balance: { gt: 0 } }, { balance: { lt: MONTHLY_FEE } }];
  else if (status === 'unpaid') where.balance = { gte: MONTHLY_FEE };
  if (paymentDay && !isNaN(parseInt(paymentDay))) where.monthly_payment_day = parseInt(paymentDay);
  if (active === 'true') where.is_active = true;
  else if (active === 'false') where.is_active = false;

  try {
    const users = await prisma.user.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    res.json({
      success: true,
      count: users.length,
      users: users.map(formatUser),
    });
  } catch (err) {
    console.error('GetUsers error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching users.' });
  }
};

/**
 * GET /users/:id
 * Get single user by ID
 */
const getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, user: formatUser(user) });
  } catch (err) {
    console.error('GetUserById error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching user.' });
  }
};

/**
 * PUT /users/:id
 * Update user details (name, address, payment day, is_active)
 */
const updateUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { id } = req.params;
  const { name, address, monthly_payment_day, is_active } = req.body;

  try {
    const existing = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ success: false, message: 'User not found.' });

    const updated = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        ...(name !== undefined && { name }),
        ...(address !== undefined && { address }),
        ...(monthly_payment_day !== undefined && { monthly_payment_day: parseInt(monthly_payment_day) }),
        monthly_fee: MONTHLY_FEE,
        ...(is_active !== undefined && { is_active: Boolean(is_active) }),
      },
    });

    res.json({
      success: true,
      message: 'User updated successfully.',
      user: formatUser(updated),
    });
  } catch (err) {
    console.error('UpdateUser error:', err);
    res.status(500).json({ success: false, message: 'Server error updating user.' });
  }
};

/**
 * DELETE /users/:id
 * Delete a user (cascade deletes payments)
 */
const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ success: false, message: 'User not found.' });

    await prisma.user.delete({ where: { id: parseInt(id) } });
    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (err) {
    console.error('DeleteUser error:', err);
    res.status(500).json({ success: false, message: 'Server error deleting user.' });
  }
};

/**
 * POST /users/:id/pay
 * Record a payment (full or partial)
 * Body: { amount_paid: number, notes?: string }
 */
const payUser = async (req, res) => {
  const { id } = req.params;
  const { amount_paid, notes } = req.body;

  if (!amount_paid || isNaN(parseFloat(amount_paid)) || parseFloat(amount_paid) <= 0) {
    return res.status(400).json({ success: false, message: 'A valid amount_paid is required.' });
  }

  const paid = parseFloat(amount_paid);

  try {
    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const today = new Date();
    const currentMonth = today.getMonth() + 1; // 1–12
    const currentYear = today.getFullYear();

    const balanceBefore = parseFloat(user.balance);
    const amountDue = parseFloat(user.monthly_fee);
    const balanceAfter = balanceBefore - paid;
    const isPaid = balanceAfter <= 0;

    // Create payment record + update user in a transaction
    const [payment, updatedUser] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          user_id: parseInt(id),
          amount_paid: paid,
          amount_due: amountDue,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          month: currentMonth,
          year: currentYear,
          notes: notes || null,
        },
      }),
      prisma.user.update({
        where: { id: parseInt(id) },
        data: {
          balance: balanceAfter,
          is_paid: isPaid,
          last_payment_date: new Date(currentYear, currentMonth - 1, today.getDate()),
        },
      }),
    ]);

    res.json({
      success: true,
      message: isPaid
        ? `Full payment recorded for ${updatedUser.name}.`
        : `Partial payment of ₱${paid.toFixed(2)} recorded. Remaining balance: ₱${Math.abs(balanceAfter).toFixed(2)}.`,
      payment: {
        ...payment,
        amount_paid: parseFloat(payment.amount_paid),
        amount_due: parseFloat(payment.amount_due),
        balance_before: parseFloat(payment.balance_before),
        balance_after: parseFloat(payment.balance_after),
      },
      user: formatUser(updatedUser),
    });
  } catch (err) {
    console.error('PayUser error:', err);
    res.status(500).json({ success: false, message: 'Server error recording payment.' });
  }
};

/**
 * PATCH /users/:id/unpay
 * Revert all payments for the current month — restores balance
 */
const unpayUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    // Find this month's payments
    const thisMonthPayments = await prisma.payment.findMany({
      where: { user_id: parseInt(id), month: currentMonth, year: currentYear },
    });

    if (thisMonthPayments.length === 0) {
      return res.status(400).json({ success: false, message: 'No payments found for this month to revert.' });
    }

    const totalRefund = thisMonthPayments.reduce((sum, p) => sum + parseFloat(p.amount_paid), 0);
    const newBalance = parseFloat(user.balance) + totalRefund;

    // Delete this month's payments + restore balance in a transaction
    await prisma.$transaction([
      prisma.payment.deleteMany({
        where: { user_id: parseInt(id), month: currentMonth, year: currentYear },
      }),
      prisma.user.update({
        where: { id: parseInt(id) },
        data: {
          balance: newBalance,
          is_paid: newBalance <= 0,
          last_payment_date: null,
        },
      }),
    ]);

    const updatedUser = await prisma.user.findUnique({ where: { id: parseInt(id) } });

    res.json({
      success: true,
      message: `Payment reverted for ${user.name}. ₱${totalRefund.toFixed(2)} restored to balance.`,
      user: formatUser(updatedUser),
    });
  } catch (err) {
    console.error('UnpayUser error:', err);
    res.status(500).json({ success: false, message: 'Server error reverting payment.' });
  }
};

/**
 * PATCH /users/:id/toggle-active
 */
const toggleActive = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const updated = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { is_active: !user.is_active },
    });

    res.json({
      success: true,
      message: `User ${updated.is_active ? 'activated' : 'deactivated'} successfully.`,
      user: formatUser(updated),
    });
  } catch (err) {
    console.error('ToggleActive error:', err);
    res.status(500).json({ success: false, message: 'Server error toggling user status.' });
  }
};

module.exports = { createUser, getUsers, getUserById, updateUser, deleteUser, payUser, unpayUser, toggleActive };
