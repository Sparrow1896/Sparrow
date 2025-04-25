const express = require('express');
const router = express.Router();

// @route   GET api/health
// @desc    Health check endpoint
// @access  Public
router.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

module.exports = router;