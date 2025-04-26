// // Script to check and display quote counts from different sources
// const mongoose = require('mongoose');
// const fs = require('fs');
// const path = require('path');
// require('dotenv').config();

// // Import Quote model
// const Quote = require('../models/Quote');

// // MongoDB connection
// const connectDB = async () => {
//   try {
//     await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/quotes-app');
//     console.log('MongoDB Connected...');
//   } catch (err) {
//     console.error('MongoDB Connection Error:', err.message);
//     process.exit(1);
//   }
// };

// // Function to check quote counts from different sources
// // async function checkQuoteCounts() {
// //   try {
// //     // Connect to MongoDB
// //     await connectDB();
    
// //     // Get quotes from MongoDB
// //     const dbQuotes = await Quote.find({});
// //     console.log(`\n📊 Quote Count Summary:`);
// //     console.log(`MongoDB: ${dbQuotes.length} quotes`);
    
// //     // Get quotes from finalapp/quotes.json
// //     const finalappPath = path.resolve(__dirname, '../finalapp/quotes.json');
// //     let finalappQuotes = [];
// //     try {
// //       finalappQuotes = JSON.parse(fs.readFileSync(finalappPath, 'utf8'));
// //       console.log(`finalapp/quotes.json: ${finalappQuotes.length} quotes`);
// //     } catch (err) {
// //       console.log('finalapp/quotes.json not found or empty');
// //     }
    
//     // Get quotes from client/public/quotes.json
//     const publicPath = path.resolve(__dirname, '../client/public/quotes.json');
//     let publicQuotes = [];
//     try {
//       publicQuotes = JSON.parse(fs.readFileSync(publicPath, 'utf8'));
//       console.log(`client/public/quotes.json: ${publicQuotes.length} quotes`);
//     } catch (err) {
//       console.log('client/public/quotes.json not found or empty');
//     }
    
//     // Compare the sources
//     if (finalappQuotes.length > dbQuotes.length) {
//       console.log(`\n⚠️ finalapp/quotes.json has ${finalappQuotes.length - dbQuotes.length} more quotes than MongoDB`);
//       console.log('These quotes need to be imported to MongoDB.');
//     } else if (dbQuotes.length > finalappQuotes.length) {
//       console.log(`\n⚠️ MongoDB has ${dbQuotes.length - finalappQuotes.length} more quotes than finalapp/quotes.json`);
//     }
    
//     if (publicQuotes.length !== dbQuotes.length) {
//       console.log(`\n⚠️ client/public/quotes.json has ${publicQuotes.length} quotes while MongoDB has ${dbQuotes.length}`);
//       console.log('The public quotes file needs to be updated.');
//     }
    
//     // Check for localStorage
//     console.log('\n📱 Browser localStorage:');
//     console.log('To check for quotes in localStorage, please:');
//     console.log('1. Open your browser developer tools (F12)');
//     console.log('2. Go to the Application tab');
//     console.log('3. Look for these items in the Local Storage section:');
//     console.log('   - "fallbackQuotesData": Cached quotes from the server');
//     console.log('   - "offlineQuotes": Quotes created while offline');
//     console.log('   - "offlineDeletedQuotes": Quotes marked for deletion while offline');
    
//     console.log('\n🔍 The 3 extra quotes are likely stored in one of these locations:');
//     console.log('1. Browser localStorage (offlineQuotes)');
//     console.log('2. The finalapp/quotes.json file (if it has more quotes than MongoDB)');
//     console.log('3. The client/public/quotes.json file (if it has more quotes than MongoDB)');
    
//     console.log('\n✅ To fix this issue:');
//     console.log('1. Run the syncQuotes.js script to import missing quotes to MongoDB');
//     console.log('2. Use the deleteQuote.js script to remove any unwanted quotes');
//     console.log('3. Clear browser localStorage if needed');
    
//     mongoose.disconnect();
//   } catch (err) {
//     console.error('Error checking quote counts:', err);
//     mongoose.disconnect();
//     process.exit(1);
//   }
// }

// // Run the check function
// checkQuoteCounts();