const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

// Stricter rate limiting for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login requests per windowMs
  message: {
    error: 'Too Many Login Attempts',
    message: 'Too many login attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Validation rules for login
const loginValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Username must be between 3 and 100 characters')
    .matches(/^[a-zA-Z0-9@._-]+$/)
    .withMessage('Username contains invalid characters'),
  body('password')
    .isLength({ min: 8, max: 200 })
    .withMessage('Password must be between 8 and 200 characters')
];

// POST /auth/login - User authentication
router.post('/login', loginLimiter, loginValidation, async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: errors.array()
      });
    }

    const { username, password } = req.body;

    // Authenticate user using Sequelize model
    const user = await User.findByCredentials(username, password);

    if (!user) {
      // Don't reveal whether username or password was wrong (security best practice)
      return res.status(401).json({
        error: 'Authentication Failed',
        message: 'Invalid username or password'
      });
    }

    // Generate JWT token
    const token = generateToken(user.toSafeJSON());

    // Send successful response
    res.status(200).json({
      message: 'Authentication successful',
      token: token,
      user: user.toSafeJSON(),
      expiresIn: '24h'
    });

    // Log successful authentication (for monitoring)
    console.log(`✅ User authenticated: ${user.username} (${user.email})`);

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Authentication Error',
      message: 'An error occurred during authentication'
    });
  }
});

// POST /auth/register - User registration (bonus endpoint)
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Input validation
    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Username, email, and password are required'
      });
    }

    // Email validation
    if (!validateEmail(email)) {
      return res.status(400).json({
        error: 'Invalid Email',
        message: 'Please provide a valid email address'
      });
    }

    // Password strength validation
    if (!validatePassword(password)) {
      return res.status(400).json({
        error: 'Weak Password',
        message: 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character'
      });
    }

    // Additional security validation
    if (!validateSQLInput(username) || !validateSQLInput(email)) {
      return res.status(400).json({
        error: 'Invalid Input',
        message: 'Invalid characters detected in input'
      });
    }

    // This is a simplified registration - in a real app, you'd hash the password here
    res.status(501).json({
      error: 'Not Implemented',
      message: 'User registration is not implemented in this demo'
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration Error',
      message: 'An error occurred during registration'
    });
  }
});

// GET /auth/verify - Verify token validity
router.get('/verify', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'No Token',
      message: 'No authentication token provided'
    });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get current user data using Sequelize
    const user = await User.findByPk(decoded.userId, {
      attributes: ['id', 'username', 'email', 'created_at'] // Exclude password_hash
    });
    
    if (!user) {
      return res.status(401).json({
        error: 'Invalid Token',
        message: 'User associated with token not found'
      });
    }

    res.status(200).json({
      message: 'Token is valid',
      user: user.toJSON()
    });

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token Expired',
        message: 'Authentication token has expired'
      });
    } else {
      return res.status(401).json({
        error: 'Invalid Token',
        message: 'Authentication token is invalid'
      });
    }
  }
});

module.exports = router;