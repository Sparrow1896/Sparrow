// Script to implement a fully functional delete quote feature for authorized users only
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Import models
const Quote = require('../models/Quote');
const User = require('../models/User');

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

// Function to verify user authentication token
async function verifyAuthToken(token) {
  try {
    if (!token) {
      return { authenticated: false, message: 'No authentication token provided' };
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return { authenticated: false, message: 'JWT_SECRET is not defined in environment variables' };
    }

    const decoded = jwt.verify(token, jwtSecret);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return { authenticated: false, message: 'User not found' };
    }

    return { authenticated: true, user };
  } catch (err) {
    return { authenticated: false, message: `Token verification error: ${err.message}` };
  }
}

// Function to delete a quote by ID or reference (for authorized users only)
async function deleteQuote(identifier, authToken) {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Verify user authentication
    const authResult = await verifyAuthToken(authToken);
    if (!authResult.authenticated) {
      console.error(`Authentication error: ${authResult.message}`);
      console.log('Only authorized users can delete quotes.');
      mongoose.disconnect();
      return;
    }
    
    console.log(`Authenticated as: ${authResult.user.username}`);
    
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
    
    // Store deleted quotes for potential undo operation
    let recentlyDeletedQuotes = [];
    
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
            // Store quote before deletion for potential undo
            recentlyDeletedQuotes.push(JSON.parse(JSON.stringify(quote)));
            
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
          
          // Store quote before deletion for potential undo
          recentlyDeletedQuotes.push(JSON.parse(JSON.stringify(quoteToDelete)));
          
          await Quote.findByIdAndDelete(quoteToDelete._id);
          console.log(`Deleted quote: ${quoteToDelete.ref}`);
        }
        
        // Update the client/public/quotes.json file
        const publicPath = path.resolve(__dirname, '../client/public/quotes.json');
        const updatedQuotes = await Quote.find({});
        fs.writeFileSync(publicPath, JSON.stringify(updatedQuotes), 'utf8');
        console.log(`Updated client/public/quotes.json with ${updatedQuotes.length} quotes`);
        
        // Save deleted quotes to a file for potential recovery
        if (recentlyDeletedQuotes.length > 0) {
          const deletedQuotesPath = path.resolve(__dirname, '../deleted_quotes_backup.json');
          let existingDeleted = [];
          
          // Read existing deleted quotes if file exists
          try {
            if (fs.existsSync(deletedQuotesPath)) {
              existingDeleted = JSON.parse(fs.readFileSync(deletedQuotesPath, 'utf8'));
            }
          } catch (err) {
            console.log('No existing deleted quotes backup found. Creating new file.');
          }
          
          // Add timestamp to deleted quotes
          const timestampedDeleted = recentlyDeletedQuotes.map(quote => ({
            ...quote,
            deletedAt: new Date().toISOString(),
            deletedBy: authResult.user.username
          }));
          
          // Combine with existing deleted quotes and limit to 100 most recent
          const allDeleted = [...timestampedDeleted, ...existingDeleted].slice(0, 100);
          fs.writeFileSync(deletedQuotesPath, JSON.stringify(allDeleted), 'utf8');
          console.log(`Saved backup of deleted quotes to deleted_quotes_backup.json`);
          
          // Offer undo option
          readline.question('\nDo you want to undo this deletion? (y/n): ', async (undoAnswer) => {
            if (undoAnswer.toLowerCase() === 'y') {
              try {
                // Restore deleted quotes
                for (const quote of recentlyDeletedQuotes) {
                  // Remove added fields
                  const { deletedAt, deletedBy, ...quoteData } = quote;
                  
                  // Create new quote with the same data
                  const restoredQuote = new Quote(quoteData);
                  await restoredQuote.save();
                  console.log(`Restored quote: ${quoteData.ref}`);
                }
                
                // Update the client/public/quotes.json file again
                const updatedQuotes = await Quote.find({});
                fs.writeFileSync(publicPath, JSON.stringify(updatedQuotes), 'utf8');
                console.log(`Updated client/public/quotes.json with ${updatedQuotes.length} quotes`);
                
                console.log('\nUndo complete!');
              } catch (err) {
                console.error('Error during undo operation:', err);
              }
            } else {
              console.log('\nDeletion complete!');
            }
            
            mongoose.disconnect();
            readline.close();
          });
        } else {
          console.log('\nDeletion complete!');
          mongoose.disconnect();
          readline.close();
        }
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
  console.log('Usage: node deleteQuote.js <quote_id_or_reference> [auth_token]');
  console.log('Note: auth_token is required for authorization');
  process.exit(1);
}

// Get the identifier from command line arguments
const identifier = process.argv[2];

// Get the auth token if provided
const authToken = process.argv[3];

// Run the delete function with auth token
deleteQuote(identifier, authToken);