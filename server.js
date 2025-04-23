const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

// Import User model
const User = require('./models/User');

// Routes
const quotesRoutes = require('./routes/quotes');
const usersRoutes = require('./routes/users');

const app = express();

// Middleware
app.use(express.json());

// Configure CORS properly - this should be before routes
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

// Connect to MongoDB
const mongoURI = process.env.MONGODB_URI;
console.log('Attempting to connect to MongoDB at:', mongoURI);

mongoose.connect(mongoURI)
  .then(() => {
    console.log('MongoDB Connected Successfully');
    // Initialize database with quotes if needed
    initializeDatabase();
  })
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1); // Exit with failure
  });

// Function to initialize database with quotes if needed
async function initializeDatabase() {
  try {
    const Quote = require('./models/Quote');
    const count = await Quote.countDocuments();
    
    if (count === 0) {
      console.log('No quotes found in database. Initializing with sample data...');
      // You could import quotes from a JSON file here if needed
      // const quotes = require('./finalapp/quotes.json');
      // await Quote.insertMany(quotes);
      console.log('Database initialized with sample quotes');
    } else {
      console.log(`Database already contains ${count} quotes`);
    }
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

// Use Routes
app.use('/api/quotes', quotesRoutes);
app.use('/api/users', usersRoutes);

// Serve static assets if in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('client/build'));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Admin initialization endpoint
app.get('/api/admin/init', async (req, res) => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (adminExists) {
      return res.status(200).json({ msg: 'Admin user already exists' });
    }
    
    // Create admin user logic here
    // ...
    
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});