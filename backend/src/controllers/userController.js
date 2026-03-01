const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');

const prisma = new PrismaClient();

/**
 * Helper: Format user response with computed status
 */
const formatUser = (user) => {
  const today = new Date();
  const currentDay = today.getDate();

  // Determine payment status: if today > payment_day and not paid → UNPAID
  const isOverdue = currentDay > user.monthly_payment_day && !user.is_paid;

  return {
    ...user,
    last_payment_date: user.last_payment_date
      ? user.last_payment_date.toISOString().split('T')[0]
      : null,
    payment_status: user.is_paid ? 'paid' : 'unpaid',
    is_overdue: isOverdue,
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

  const { name, address, monthly_payment_day, is_active } = req.body;

  try {
    const user = await prisma.user.create({
      data: {
        name,
        address,
        monthly_payment_day: parseInt(monthly_payment_day),
        is_active: is_active !== undefined ? Boolean(is_active) : true,
        is_paid: false,
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

  // Search by name OR address
  if (search && search.trim()) {
    where.OR = [
      { name: { contains: search.trim() } },
      { address: { contains: search.trim() } },
    ];
  }

  // Filter by payment status
  if (status === 'paid') {
    where.is_paid = true;
  } else if (status === 'unpaid') {
    where.is_paid = false;
  }

  // Filter by payment day
  if (paymentDay && !isNaN(parseInt(paymentDay))) {
    where.monthly_payment_day = parseInt(paymentDay);
  }

  // Filter by active status
  if (active === 'true') {
    where.is_active = true;
  } else if (active === 'false') {
    where.is_active = false;
  }

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

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({ success: true, user: formatUser(user) });
  } catch (err) {
    console.error('GetUserById error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching user.' });
  }
};

/**
 * PUT /users/:id
 * Update user details
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
    if (!existing) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const updated = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        ...(name !== undefined && { name }),
        ...(address !== undefined && { address }),
        ...(monthly_payment_day !== undefined && { monthly_payment_day: parseInt(monthly_payment_day) }),
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
 * Delete a user
 */
const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    await prisma.user.delete({ where: { id: parseInt(id) } });

    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (err) {
    console.error('DeleteUser error:', err);
    res.status(500).json({ success: false, message: 'Server error deleting user.' });
  }
};

/**
 * POST /users/:id/pay
 * Mark user as paid for current month
 */
const payUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Prevent duplicate payment for same month
    if (user.is_paid && user.last_payment_date) {
      const lastPayment = new Date(user.last_payment_date);
      const today = new Date();

      if (
        lastPayment.getMonth() === today.getMonth() &&
        lastPayment.getFullYear() === today.getFullYear()
      ) {
        return res.status(400).json({
          success: false,
          message: 'Payment already recorded for this month.',
        });
      }
    }

    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const updated = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        is_paid: true,
        last_payment_date: todayDate,
      },
    });

    res.json({
      success: true,
      message: `Payment recorded for ${updated.name}.`,
      user: formatUser(updated),
    });
  } catch (err) {
    console.error('PayUser error:', err);
    res.status(500).json({ success: false, message: 'Server error recording payment.' });
  }
};

/**
 * PATCH /users/:id/toggle-active
 * Activate or deactivate a user
 */
const toggleActive = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

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

/**
 * PATCH /users/:id/unpay
 * Mark user as unpaid (revert payment)
 */
const unpayUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (!user.is_paid) {
      return res.status(400).json({ success: false, message: 'User is already marked as unpaid.' });
    }

    const updated = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        is_paid: false,
        last_payment_date: null,
      },
    });

    res.json({
      success: true,
      message: `Payment reverted for ${updated.name}.`,
      user: formatUser(updated),
    });
  } catch (err) {
    console.error('UnpayUser error:', err);
    res.status(500).json({ success: false, message: 'Server error reverting payment.' });
  }
};

module.exports = { createUser, getUsers, getUserById, updateUser, deleteUser, payUser, unpayUser, toggleActive };
