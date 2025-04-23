const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Quote = require('../models/Quote');
const mongoose = require('mongoose');

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

module.exports = router;