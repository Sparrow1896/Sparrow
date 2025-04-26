const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Authentication middleware
 * Verifies JWT token and adds user data to request
 */
function auth(req, res, next) {
  // Enhanced logging for debugging auth issues
  console.log(`Auth middleware called for ${req.method} ${req.originalUrl}`);
  
  // Get token from header, query, or body for flexibility
  const token = req.header('x-auth-token') || 
                req.header('Authorization')?.replace('Bearer ', '') ||
                req.query.token || 
                (req.body && req.body.token);

  // Check for token
  if (!token) {
    console.log('Authentication failed: No token provided');
    return res.status(401).json({ 
      msg: 'No token, authorization denied',
      code: 'NO_TOKEN'
    });
  }

  try {
    // Verify token with JWT_SECRET from .env
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET is not defined in environment variables');
      return res.status(500).json({ 
        msg: 'Server configuration error', 
        code: 'CONFIG_ERROR'
      });
    }
    
    // Verify the token and handle potential errors
    try {
      const decoded = jwt.verify(token, jwtSecret);
      
      // Log successful authentication
      console.log(`User authenticated: ${decoded.id}`);
      
      // Add user from payload
      req.user = decoded;
      next();
    } catch (tokenError) {
      // Provide more specific error messages based on the error type
      if (tokenError.name === 'TokenExpiredError') {
        console.error('Token expired:', tokenError.message);
        return res.status(401).json({ 
          msg: 'Token has expired, please log in again',
          code: 'TOKEN_EXPIRED'
        });
      } else if (tokenError.name === 'JsonWebTokenError') {
        console.error('Invalid token:', tokenError.message);
        return res.status(401).json({ 
          msg: 'Invalid token, please log in again',
          code: 'INVALID_TOKEN'
        });
      } else {
        console.error('Token verification error:', tokenError.message);
        return res.status(401).json({ 
          msg: 'Token verification failed',
          code: 'TOKEN_VERIFICATION_FAILED'
        });
      }
    }
  } catch (e) {
    console.error('Unexpected auth error:', e.message);
    res.status(500).json({ 
      msg: 'Server error during authentication',
      code: 'SERVER_ERROR'
    });
  }
}

module.exports = auth;