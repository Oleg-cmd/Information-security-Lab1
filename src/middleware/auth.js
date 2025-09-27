const jwt = require('jsonwebtoken');
const { User } = require('../models');

// JWT Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Access Denied',
        message: 'Authentication token is required'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database to ensure user still exists using Sequelize
    const user = await User.findByPk(decoded.userId, {
      attributes: ['id', 'username', 'email', 'created_at'] // Exclude password_hash
    });
    
    if (!user) {
      return res.status(401).json({
        error: 'Invalid Token',
        message: 'User associated with token not found'
      });
    }

    // Add user info to request object
    req.user = user.toJSON();
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token Expired',
        message: 'Authentication token has expired'
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid Token',
        message: 'Authentication token is invalid'
      });
    } else {
      console.error('Authentication error:', error);
      return res.status(500).json({
        error: 'Authentication Error',
        message: 'An error occurred during authentication'
      });
    }
  }
};

// Generate JWT token
const generateToken = (user) => {
  const payload = {
    userId: user.id,
    username: user.username,
    email: user.email
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '24h', // Token expires in 24 hours
    issuer: 'secure-rest-api',
    audience: 'api-users'
  });
};

// Verify token without throwing errors (for optional authentication)
const verifyTokenOptional = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
  } catch (error) {
    req.user = null;
  }

  next();
};

module.exports = {
  authenticateToken,
  generateToken,
  verifyTokenOptional
};