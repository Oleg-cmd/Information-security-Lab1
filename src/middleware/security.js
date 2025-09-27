const validator = require('validator');
const xss = require('xss');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

// XSS protection middleware using proven library
const xssMiddleware = (req, res, next) => {
  try {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    
    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }
    
    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }
    
    next();
  } catch (error) {
    console.error('XSS protection error:', error);
    res.status(500).json({
      error: 'Security validation failed',
      message: 'Request could not be processed due to security constraints'
    });
  }
};

// Recursively sanitize object properties using XSS library
function sanitizeObject(obj) {
  if (obj === null || typeof obj !== 'object') {
    return sanitizeInput(obj);
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = sanitizeInput(key);
    
    if (Array.isArray(value)) {
      sanitized[sanitizedKey] = value.map(item => 
        typeof item === 'object' ? sanitizeObject(item) : sanitizeInput(item)
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[sanitizedKey] = sanitizeObject(value);
    } else {
      sanitized[sanitizedKey] = sanitizeInput(value);
    }
  }
  
  return sanitized;
}

// Sanitize individual input values using XSS library
function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return input;
  }
  
  // Use XSS library for better protection
  return xss(input, {
    whiteList: {}, // No HTML tags allowed
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style']
  });
}

// Combined security middleware
const securityMiddleware = [
  // NoSQL injection protection
  mongoSanitize({
    replaceWith: '_'
  }),
  // HTTP Parameter Pollution protection
  hpp({
    whitelist: ['sort', 'fields', 'limit', 'skip'] // Allow certain params to be arrays
  }),
  // Custom XSS protection
  xssMiddleware
];

// Validate email format
const validateEmail = (email) => {
  return validator.isEmail(email);
};

// Validate password strength
const validatePassword = (password) => {
  return validator.isLength(password, { min: 8, max: 128 }) &&
         validator.matches(password, /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/);
};

// Validate input against SQL injection patterns
const validateSQLInput = (input) => {
  if (typeof input !== 'string') return true;
  
  const sqlInjectionPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /(\'|\"|\-\-|\;|\||&)/,
    /(\%27|\%22|\%2D\%2D|\%3B|\%7C|\%26)/i
  ];
  
  return !sqlInjectionPatterns.some(pattern => pattern.test(input));
};

module.exports = {
  securityMiddleware,
  sanitizeInput,
  validateEmail,
  validatePassword,
  validateSQLInput
};