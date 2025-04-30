const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Import Quote model
const Quote = require('../models/Quote');

// MongoDB connection
const mongoURI = process.env.MONGODB_URI;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Only log connection attempt in development, not the actual URI for security
if (NODE_ENV === 'development') {
  console.log('Attempting to connect to MongoDB...');
} else {
  console.log('Attempting to connect to MongoDB in production mode');
}

// Add connection options to match server.js
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
    importQuotes();
  })
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  });

async function importQuotes() {
  try {
    // Check if quotes already exist
    const count = await Quote.countDocuments();
    if (count > 0) {
      console.log(`Database already contains ${count} quotes. Skipping import.`);
      console.log('To reimport, please clear the collection first.');
      mongoose.disconnect();
      return;
    }

    // Read quotes from JSON file
    const quotesPath = path.resolve(__dirname, '../client/public/quotes.json');
    const quotesData = fs.readFileSync(quotesPath, 'utf8');
    const quotes = JSON.parse(quotesData);

    console.log(`Importing ${quotes.length} quotes to MongoDB...`);

    // Insert quotes into MongoDB
    await Quote.insertMany(quotes);
    
    console.log('Quotes imported successfully!');
    mongoose.disconnect();
  } catch (err) {
    console.error('Error importing quotes:', err);
    mongoose.disconnect();
    process.exit(1);
  }
}