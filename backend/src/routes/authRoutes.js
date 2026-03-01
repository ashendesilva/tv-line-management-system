const express = require('express');
const { body } = require('express-validator');
const { login, getMe } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Validation rules
const loginValidation = [
  body('username').trim().notEmpty().withMessage('Username is required.'),
  body('password').notEmpty().withMessage('Password is required.'),
];

// POST /auth/login
router.post('/login', loginValidation, login);

// GET /auth/me (protected)
router.get('/me', authMiddleware, getMe);

module.exports = router;
