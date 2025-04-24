// Script to implement a fully functional delete quote feature
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

// Function to delete a quote by ID or reference
async function deleteQuote(identifier) {
  try {
    // Connect to MongoDB
    await connectDB();
    
    let query = {};
    
    // Check if identifier is a MongoDB ObjectId
    if (/^[0-9a-fA-F]{24}$/.test(identifier)) {
      query._id = identifier;
    } else {
      // Otherwise, search by reference
      query.ref = new RegExp(identifier, 'i');
    }
    
    // Find the quote(s) to delete
    const quotesToDelete = await Quote.find(query);
    
    if (quotesToDelete.length === 0) {
      console.log(`No quotes found matching: ${identifier}`);
      mongoose.disconnect();
      return;
    }
    
    console.log(`Found ${quotesToDelete.length} quote(s) matching: ${identifier}`);
    
    // Display the quotes to confirm deletion
    quotesToDelete.forEach((quote, index) => {
      console.log(`\n[${index + 1}] ID: ${quote._id}`);
      console.log(`Reference: ${quote.ref}`);
      console.log(`Statements: ${quote.statements.length}`);
      quote.statements.forEach((statement, i) => {
        console.log(`  Statement ${i + 1}: ${statement.statement.substring(0, 100)}...`);
      });
    });
    
    // Confirm deletion
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question('\nEnter the number of the quote to delete, or "all" to delete all matches: ', async (answer) => {
      try {
        if (answer.toLowerCase() === 'all') {
          // Delete all matching quotes
          for (const quote of quotesToDelete) {
            await Quote.findByIdAndDelete(quote._id);
            console.log(`Deleted quote: ${quote.ref}`);
          }
        } else {
          const index = parseInt(answer) - 1;
          if (isNaN(index) || index < 0 || index >= quotesToDelete.length) {
            console.log('Invalid selection. No quotes deleted.');
            mongoose.disconnect();
            readline.close();
            return;
          }
          
          // Delete the selected quote
          const quoteToDelete = quotesToDelete[index];
          await Quote.findByIdAndDelete(quoteToDelete._id);
          console.log(`Deleted quote: ${quoteToDelete.ref}`);
        }
        
        // Update the client/public/quotes.json file
        const publicPath = path.resolve(__dirname, '../client/public/quotes.json');
        const updatedQuotes = await Quote.find({});
        fs.writeFileSync(publicPath, JSON.stringify(updatedQuotes), 'utf8');
        console.log(`Updated client/public/quotes.json with ${updatedQuotes.length} quotes`);
        
        console.log('\nDeletion complete!');
        mongoose.disconnect();
        readline.close();
      } catch (err) {
        console.error('Error during deletion:', err);
        mongoose.disconnect();
        readline.close();
      }
    });
  } catch (err) {
    console.error('Error deleting quote:', err);
    mongoose.disconnect();
    process.exit(1);
  }
}

// Check command line arguments
if (process.argv.length < 3) {
  console.log('Usage: node deleteQuote.js <quote_id_or_reference>');
  process.exit(1);
}

// Get the identifier from command line arguments
const identifier = process.argv[2];

// Run the delete function
deleteQuote(identifier);