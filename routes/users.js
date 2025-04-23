const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// @route   POST api/users/login
// @desc    Authenticate user
// @access  Public
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Simple validation
  if (!username || !password) {
    return res.status(400).json({ msg: 'Please enter all fields' });
  }

  try {
    // Check for existing user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ msg: 'User does not exist' });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Create token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET is not defined in environment variables');
      return res.status(500).json({ msg: 'Server configuration error' });
    }
    
    const token = jwt.sign(
      { id: user.id, username: user.username },
      jwtSecret,
      { expiresIn: 3600 } // 1 hour
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/users/init
// @desc    Initialize admin user if not exists (one-time setup)
// @access  Public
router.post('/init', async (req, res) => {
  try {
    // Check if admin user already exists
    const existingUser = await User.findOne({ username: 'MohanaKrishnaDasa' });
    
    if (existingUser) {
      return res.status(400).json({ msg: 'Admin user already initialized' });
    }
    
    // Create salt & hash
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('AGTSP', salt);
    
    // Create new user
    const newUser = new User({
      username: 'MohanaKrishnaDasa',
      password: hash
    });
    
    await newUser.save();
    res.json({ msg: 'Admin user initialized successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;