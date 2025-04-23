const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Create Schema for a statement
const StatementSchema = new Schema({
  statement: {
    type: String,
    required: true
  },
  tags: {
    type: [String],
    default: []
  },
  keywords: {
    type: [String],
    default: []
  },
  id: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString()
  }
});

// Create Schema for a quote
const QuoteSchema = new Schema({
  ref: {
    type: String,
    required: true
  },
  speaker: {
    type: String,
    default: 'Śrīla Prabhupāda'
  },
  date: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    default: ''
  },
  lecture: {
    type: String,
    default: ''
  },
  statements: {
    type: [StatementSchema],
    required: true
  },
  collection: {
    type: String,
    default: 'Mix',
    enum: ['Mix', 'Bhagavad-gītā As It Is', 'The Empowered Ācārya', 'Śrīmad-Bhāgavatam', 'Śrī Caitanya-caritāmṛta', 'Superman']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = Quote = mongoose.model('quote', QuoteSchema);