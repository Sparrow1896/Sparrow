// Script to update client/public/quotes.json with the latest data from MongoDB
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import Quote model
const Quote = require('../models/Quote');

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/quotes-app');
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('MongoDB Connection Error:', err.message);
    process.exit(1);
  }
};

// Function to update client/public/quotes.json
async function updatePublicQuotes() {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Get quotes from MongoDB
    const dbQuotes = await Quote.find({});
    console.log(`Found ${dbQuotes.length} quotes in MongoDB`);
    
    // Path to client/public/quotes.json
    const publicPath = path.resolve(__dirname, '../client/public/quotes.json');
    
    // Write quotes to file
    fs.writeFileSync(publicPath, JSON.stringify(dbQuotes), 'utf8');
    console.log(`✅ Successfully updated client/public/quotes.json with ${dbQuotes.length} quotes`);
    
    // Disconnect from MongoDB
    mongoose.disconnect();
  } catch (err) {
    console.error('Error updating public quotes:', err);
    mongoose.disconnect();
    process.exit(1);
  }
}

// Run the update function
updatePublicQuotes();