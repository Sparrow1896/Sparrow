// Script to identify and sync quotes between MongoDB and local storage
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

// Function to compare quotes and identify discrepancies
async function syncQuotes() {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Get quotes from MongoDB
    const dbQuotes = await Quote.find({});
    console.log(`MongoDB contains ${dbQuotes.length} quotes`);
    
    // Get quotes from finalapp/quotes.json
    const finalappPath = path.resolve(__dirname, '../client/public/quotes.json');
    const finalappQuotes = JSON.parse(fs.readFileSync(finalappPath, 'utf8'));
    console.log(`client/public/quotes.json contains ${finalappQuotes.length} quotes`);
    
    // Get quotes from client/public/quotes.json
    const publicPath = path.resolve(__dirname, '../client/public/quotes.json');
    let publicQuotes = [];
    try {
      publicQuotes = JSON.parse(fs.readFileSync(publicPath, 'utf8'));
      console.log(`client/public/quotes.json contains ${publicQuotes.length} quotes`);
    } catch (err) {
      console.log('client/public/quotes.json not found or empty');
    }
    
    // Check for quotes in finalapp that are not in MongoDB
    const missingInDB = [];
    finalappQuotes.forEach(fQuote => {
      const found = dbQuotes.some(dbQuote => 
        dbQuote.ref === fQuote.ref && 
        dbQuote.statements.length === fQuote.statements.length
      );
      
      if (!found) {
        missingInDB.push(fQuote);
      }
    });
    
    console.log(`Found ${missingInDB.length} quotes in finalapp/quotes.json that are not in MongoDB`);
    
    // Import missing quotes to MongoDB if any
    if (missingInDB.length > 0) {
      console.log('Importing missing quotes to MongoDB...');
      for (const quote of missingInDB) {
        const newQuote = new Quote(quote);
        await newQuote.save();
        console.log(`Imported quote: ${quote.ref}`);
      }
      console.log('Import complete!');
    }
    
    // Update client/public/quotes.json with the latest MongoDB data
    console.log('Updating client/public/quotes.json with latest MongoDB data...');
    const updatedDBQuotes = await Quote.find({});
    fs.writeFileSync(publicPath, JSON.stringify(updatedDBQuotes), 'utf8');
    console.log(`Updated client/public/quotes.json with ${updatedDBQuotes.length} quotes`);
    
    // Check for any quotes in localStorage
    console.log('\nNOTE: This script cannot access browser localStorage directly.');
    console.log('To check for quotes in localStorage, please:');
    console.log('1. Open your browser developer tools (F12)');
    console.log('2. Go to the Application tab');
    console.log('3. Look for "offlineQuotes" in the Local Storage section');
    console.log('4. If any quotes exist there, they need to be synced with the database');
    
    console.log('\nSync complete!');
    mongoose.disconnect();
  } catch (err) {
    console.error('Error syncing quotes:', err);
    mongoose.disconnect();
    process.exit(1);
  }
}

// Run the sync function
syncQuotes();