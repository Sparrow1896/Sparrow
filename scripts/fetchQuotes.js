const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Use the connection string from environment variables
const uri = process.env.MONGODB_URI;

// Log connection attempt (but not the full URI for security)
console.log('Attempting to connect to MongoDB...');

// Add connection options to handle SSL issues
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  ssl: true,
  tls: true,
  tlsAllowInvalidCertificates: true,
  retryWrites: true,
  serverSelectionTimeoutMS: 5000, // 5 second timeout for server selection
  connectTimeoutMS: 10000 // 10 second timeout for initial connection
});

async function fetchAllQuotes() {
  let isConnected = false;
  try {
    await client.connect();
    isConnected = true;
    console.log('Connected to MongoDB successfully');
    
    const database = client.db(); // This will use the database from the connection string
    const collections = await database.listCollections().toArray();
    
    let allQuotes = {};
    
    // If no collections found, try to access the quotes collection directly
    if (collections.length === 0) {
      console.log('No collections found, trying to access quotes collection directly');
      const quotesCollection = database.collection('quotes');
      const documents = await quotesCollection.find({}).toArray();
      console.log(`Found ${documents.length} documents in quotes collection`);
      allQuotes['quotes'] = documents;
      return allQuotes;
    }
    
    for (let collectionInfo of collections) {
      // Skip system collections
      if (collectionInfo.name.startsWith('system.')) continue;
      
      const collection = database.collection(collectionInfo.name);
      const documents = await collection.find({}).toArray();
      
      console.log(`Found ${documents.length} documents in ${collectionInfo.name}`);
      allQuotes[collectionInfo.name] = documents;
    }
    
    return allQuotes;
  } catch (error) {
    console.error('Error fetching quotes:', error);
    throw error;
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Export the function to be used in other files
module.exports = { fetchAllQuotes };

// If this script is run directly, execute the function
if (require.main === module) {
  fetchAllQuotes()
    .then(quotes => {
      console.log('Successfully fetched all quotes');
      // You can add additional processing here if needed
    })
    .catch(err => {
      console.error('Failed to fetch quotes:', err);
      process.exit(1);
    });
}