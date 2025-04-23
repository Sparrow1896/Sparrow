const jwt = require('jsonwebtoken');
require('dotenv').config();

function auth(req, res, next) {
  const token = req.header('x-auth-token');

  // Check for token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    // Verify token with JWT_SECRET from .env
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET is not defined in environment variables');
      return res.status(500).json({ msg: 'Server configuration error' });
    }
    
    const decoded = jwt.verify(token, jwtSecret);
    
    // Add user from payload
    req.user = decoded;
    next();
  } catch (e) {
    console.error('Token verification error:', e.message);
    res.status(400).json({ msg: 'Token is not valid' });
  }
}

module.exports = auth;