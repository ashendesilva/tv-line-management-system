const express = require('express');
const { body } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  payUser,
  unpayUser,
  toggleActive,
} = require('../controllers/userController');
const { getPayments, deletePayment } = require('../controllers/paymentController');

const router = express.Router();

// All user routes require authentication
router.use(authMiddleware);

// Validation rules
const createUserValidation = [
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('address').trim().notEmpty().withMessage('Address is required.'),
  body('monthly_payment_day')
    .isInt({ min: 1, max: 31 })
    .withMessage('Payment day must be between 1 and 31.'),
];

const updateUserValidation = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty.'),
  body('address').optional().trim().notEmpty().withMessage('Address cannot be empty.'),
  body('monthly_payment_day')
    .optional()
    .isInt({ min: 1, max: 31 })
    .withMessage('Payment day must be between 1 and 31.'),
];

// POST /users
router.post('/', createUserValidation, createUser);

// GET /users?search=&status=&paymentDay=&active=
router.get('/', getUsers);

// GET /users/:id
router.get('/:id', getUserById);

// PUT /users/:id
router.put('/:id', updateUserValidation, updateUser);

// DELETE /users/:id
router.delete('/:id', deleteUser);

// POST /users/:id/pay  — body: { amount_paid, notes? }
router.post('/:id/pay', payUser);

// PATCH /users/:id/unpay
router.patch('/:id/unpay', unpayUser);

// PATCH /users/:id/toggle-active
router.patch('/:id/toggle-active', toggleActive);

// GET /users/:id/payments?year=
router.get('/:id/payments', getPayments);

// DELETE /users/:id/payments/:paymentId
router.delete('/:id/payments/:paymentId', deletePayment);

module.exports = router;
