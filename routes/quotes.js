const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Quote = require('../models/Quote');
const mongoose = require('mongoose');

// Store recently deleted quotes for undo functionality
let recentlyDeletedQuotes = [];

// @route   GET api/quotes
// @desc    Get all quotes with optional filtering
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { collection, search, tags } = req.query;
    let query = {};
    
    // Filter by collection if provided
    if (collection && collection !== 'all') {
      query.collection = collection;
    }
    
    // Filter by tags if provided
    if (tags) {
      const tagArray = tags.split(',');
      query['statements.tags'] = { $in: tagArray };
    }
    
    // Search in statements or references if provided
    if (search) {
      query.$or = [
        { 'statements.statement': { $regex: search, $options: 'i' } },
        { ref: { $regex: search, $options: 'i' } },
        { 'statements.tags': { $regex: search, $options: 'i' } },
        { 'statements.keywords': { $regex: search, $options: 'i' } }
      ];
    }
    
    console.log('Quote query:', query); // Add logging
    const quotes = await Quote.find(query).sort({ createdAt: -1 });
    console.log(`Found ${quotes.length} quotes`); // Add logging
    
    res.json(quotes);
  } catch (err) {
    console.error('Error in GET /api/quotes:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/quotes
// @desc    Add a new quote
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { ref, speaker, statements, collection } = req.body;
    
    if (!ref || !statements || statements.length === 0) {
      return res.status(400).json({ msg: 'Please provide reference and at least one statement' });
    }
    
    // Process statements
    const processedStatements = statements.map(statement => {
      // Generate tag format based on collection if needed
      let tags = [...statement.tags];
      
      // Add collection-specific tag if not already present
      if (collection && collection !== 'Mix') {
        const collectionMap = {
          'Bhagavad-gītā As It Is': 'quotecard:bgatis',
          'Śrīmad-Bhāgavatam': 'quotecard:sb',
          'Śrī Caitanya-caritāmṛta': 'quotecard:cc',
          'The Empowered Ācārya': 'quotecard:lila-amrita',
          'Superman': 'quotecard:superman'
        };
        
        const collectionTag = collectionMap[collection];
        if (collectionTag && !tags.includes(collectionTag)) {
          tags.push(collectionTag);
        }
      }
      
      return {
        ...statement,
        tags
      };
    });
    
    const newQuote = new Quote({
      ref,
      speaker: speaker || 'Śrīla Prabhupāda',
      date: extractDateFromReference(ref),
      location: extractLocationFromReference(ref),
      lecture: extractLectureFromReference(ref),
      statements: processedStatements,
      collection: collection || 'Mix'
    });
    
    const quote = await newQuote.save();
    res.json(quote);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Helper functions
function extractDateFromReference(ref) {
  const dateMatch = ref.match(/\b(19|20)\d{2}\b/);
  return dateMatch ? dateMatch[0] : "";
}

function extractLocationFromReference(ref) {
  const commonLocations = ["New York", "London", "Mayapur", "Vrindavan", "Bombay", "Los Angeles", "Tokyo"];
  for (const location of commonLocations) {
    if (ref.includes(location)) {
      return location;
    }
  }
  return "";
}

function extractLectureFromReference(ref) {
  const lectureMatch = ref.match(/lecture on (.+?)(?=\s+in\s+|$)/i);
  return lectureMatch ? lectureMatch[0] : "";
}

// @route   DELETE api/quotes/:id
// @desc    Delete a quote
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const id = req.params.id;
    let quote;
    
    // Enhanced logging for debugging
    console.log(`Delete quote request received for ID: ${id}`);
    console.log(`ID type: ${typeof id}, ID length: ${id.length}`);
    
    // Try to find the quote by ID first - handle both string and ObjectId formats
    try {
      // Check if the ID is a valid ObjectId
      if (mongoose.Types.ObjectId.isValid(id)) {
        console.log(`ID ${id} is a valid ObjectId, searching by _id`);
        quote = await Quote.findById(id);
      }
    } catch (idErr) {
      console.error(`Error checking ObjectId validity: ${idErr.message}`);
      // Continue to other search methods
    }
    
    // If not found by ID, try to find by other identifiers
    if (!quote) {
      console.log(`Quote not found by _id, trying alternative search methods`);
      // Try to find by reference or statement content
      try {
        quote = await Quote.findOne({
          $or: [
            { ref: id },
            { 'statements.statement': id },
            // Also try to match by statement ID
            { 'statements.id': id }
          ]
        });
      } catch (searchErr) {
        console.error(`Error in alternative search: ${searchErr.message}`);
      }
    }
    
    if (!quote) {
      console.log(`Quote not found with identifier: ${id}`);
      return res.status(404).json({ msg: 'Quote not found' });
    }
    
    // Log the deletion for audit purposes
    console.log(`Quote found! ID: ${quote._id}, Ref: ${quote.ref}`);
    console.log(`Quote deletion requested by user ${req.user.id}`);
    
    // Store the quote for potential undo operation with user info
    const quoteWithMeta = quote.toObject();
    quoteWithMeta.deletedBy = req.user.id;
    quoteWithMeta.deletedAt = new Date().toISOString();
    
    recentlyDeletedQuotes.push(quoteWithMeta);
    // Limit the undo history to last 10 deleted quotes
    if (recentlyDeletedQuotes.length > 10) {
      recentlyDeletedQuotes.shift();
    }
    
    // Delete the quote
    await quote.deleteOne();
    
    // Return success response with the deleted quote ID
    res.json({ 
      msg: 'Quote deleted successfully', 
      id: quote._id, // Return the actual MongoDB _id for consistency
      originalId: req.params.id, // Also return the original ID that was passed
      deletedAt: quoteWithMeta.deletedAt
    });
  } catch (err) {
    console.error(`Error in DELETE /api/quotes/${req.params.id}:`, err.message);
    
    // Provide detailed error logging
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Quote not found - invalid ObjectId format' });
    } else if (err.name === 'CastError') {
      return res.status(400).json({ msg: 'Invalid ID format' });
    } else if (err.name === 'ValidationError') {
      return res.status(400).json({ msg: err.message });
    }
    
    // Log the full error for debugging
    console.error('Full error object:', err);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   POST api/quotes/undo
// @desc    Restore the last deleted quote
// @access  Private
router.post('/undo', auth, async (req, res) => {
  try {
    if (recentlyDeletedQuotes.length === 0) {
      return res.status(404).json({ msg: 'No recently deleted quotes to restore' });
    }
    
    // Get the most recently deleted quote
    const quoteToRestore = recentlyDeletedQuotes.pop();
    
    // Log the restoration for audit purposes
    console.log(`Quote restoration requested by user ${req.user.id} for quote: ${quoteToRestore.ref}`);
    
    // Remove metadata fields that shouldn't be saved to the database
    const { deletedBy, deletedAt, _id, __v, ...quoteData } = quoteToRestore;
    
    // Create a new quote with the same data
    const restoredQuote = new Quote(quoteData);
    
    // Save the restored quote
    await restoredQuote.save();
    
    // Update the client/public/quotes.json file
    try {
      const publicPath = path.resolve(__dirname, '../client/public/quotes.json');
      const updatedQuotes = await Quote.find({});
      fs.writeFileSync(publicPath, JSON.stringify(updatedQuotes), 'utf8');
      console.log(`Updated client/public/quotes.json after quote restoration`);
    } catch (fileErr) {
      console.error('Error updating public quotes file:', fileErr);
      // Continue even if file update fails
    }
    
    // Return the restored quote
    res.json({
      msg: 'Quote restored successfully',
      quote: restoredQuote
    });
  } catch (err) {
    console.error('Error in POST /api/quotes/undo:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   GET api/quotes/count
// @desc    Get the total count of quotes
// @access  Public
router.get('/count', async (req, res) => {
  try {
    const count = await Quote.countDocuments();
    res.json({ count });
  } catch (err) {
    console.error('Error getting quote count:', err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;