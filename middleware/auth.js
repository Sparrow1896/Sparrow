const jwt = require('jsonwebtoken');
require('dotenv').config();

function auth(req, res, next) {
  // Get token from header, query, or body for flexibility
  const token = req.header('x-auth-token') || 
                req.query.token || 
                (req.body && req.body.token);

  // Check for token
  if (!token) {
    console.log('Authentication failed: No token provided');
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    // Verify token with JWT_SECRET from .env
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET is not defined in environment variables');
      return res.status(500).json({ msg: 'Server configuration error' });
    }
    
    // Verify the token and handle potential errors
    try {
      const decoded = jwt.verify(token, jwtSecret);
      
      // Add user from payload
      req.user = decoded;
      next();
    } catch (tokenError) {
      // Provide more specific error messages based on the error type
      if (tokenError.name === 'TokenExpiredError') {
        console.error('Token expired:', tokenError.message);
        return res.status(401).json({ msg: 'Token has expired, please log in again' });
      } else if (tokenError.name === 'JsonWebTokenError') {
        console.error('Invalid token:', tokenError.message);
        return res.status(401).json({ msg: 'Invalid token, please log in again' });
      } else {
        console.error('Token verification error:', tokenError.message);
        return res.status(401).json({ msg: 'Token verification failed' });
      }
    }
  } catch (e) {
    console.error('Unexpected auth error:', e.message);
    res.status(500).json({ msg: 'Server error during authentication' });
  }
}

module.exports = auth;