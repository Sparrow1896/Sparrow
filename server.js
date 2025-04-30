const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Set environment variables
const NODE_ENV = process.env.NODE_ENV || 'development';

// Import User model
const User = require('./models/User');

// Routes
const quotesRoutes = require('./routes/quotes');
const usersRoutes = require('./routes/users');
const authRoutes = require('./routes/auth');

const app = express();

// Middleware
app.use(express.json());

// Configure CORS properly - this should be before routes
const corsOptions = {
  origin: NODE_ENV === 'production' 
    ? process.env.CLIENT_URL || 'https://yourdomain.com' 
    : ['http://localhost:3000', 'http://localhost:5501', 'http://127.0.0.1:5501'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-auth-token', 'Authorization']
};

app.use(cors(corsOptions));

// Add OPTIONS handling for preflight requests
app.options('*', cors());

// Connect to MongoDB
const mongoURI = process.env.MONGODB_URI;

// Only log connection attempt in development, not the actual URI for security
if (NODE_ENV === 'development') {
  console.log('Attempting to connect to MongoDB...');
} else {
  console.log('Attempting to connect to MongoDB in production mode');
}

// Add connection options to handle SSL issues
mongoose.connect(mongoURI, {
  serverApi: {
    version: '1',
    strict: true,
    deprecationErrors: true
  },
  ssl: true,
  tls: true,
  tlsAllowInvalidCertificates: true,
  retryWrites: true,
  useNewUrlParser: true,
  useUnifiedTopology: true
})
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
    const Quote = require('./models/Quotes');
    const count = await Quote.countDocuments();
    
    if (count === 0) {
      console.log('No quotes found in database. Initializing with sample data...');
      try {
        // Import quotes from the JSON file
        const fs = require('fs');
        const path = require('path');
        const quotesPath = path.resolve(__dirname, './client/public/quotes.json');
        
        if (fs.existsSync(quotesPath)) {
          const quotesData = fs.readFileSync(quotesPath, 'utf8');
          const quotes = JSON.parse(quotesData);
          await Quote.insertMany(quotes);
          console.log(`Database initialized with ${quotes.length} quotes`);
        } else {
          console.log('Quotes file not found at:', quotesPath);
        }
      } catch (importErr) {
        console.error('Error importing quotes:', importErr);
      }
    } else {
      console.log(`Database already contains ${count} quotes`);
    }
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

// Add health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'API is running',
    environment: NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Use Routes
app.use('/api/quotes', quotesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/auth', authRoutes);

// Serve static assets in production
if (NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static('client/build'));

  // Any route that is not an API route should be handled by React
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}

// Legacy code - removed as it's replaced by the above block
// if (process.env.NODE_ENV === 'production') {
//   app.use(express.static('client/build'));
//   app.get('*', (req, res) => {
//     res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
//   });
// }

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