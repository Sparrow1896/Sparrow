import React, { useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import { useQuote } from '../context/QuoteContext';
import './styles/Modal.css';

const AddQuoteModal = () => {
  const { isAddQuoteModalOpen, toggleAddQuoteModal, addQuote } = useQuote();
  
  const [formData, setFormData] = useState({
    statement: '',
    reference: '',
    speaker: 'Śrīla Prabhupāda',
    collection: 'Mix',
    keywords: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Create statement object
    const keywords = formData.keywords
      .split(',')
      .map(keyword => keyword.trim())
      .filter(keyword => keyword.length > 0);
    
    // Create tags based on collection
    const tags = [];
    if (formData.collection !== 'Mix') {
      const collectionTag = getCollectionTag(formData.collection);
      if (collectionTag && !tags.includes(collectionTag)) {
        tags.push(collectionTag);
      }
    }
    
    // Add keywords as tags if they're not already there
    keywords.forEach(keyword => {
      if (!tags.includes(keyword)) {
        tags.push(keyword);
      }
    });
    
    // Process statement text to properly handle line breaks
    // This ensures <br> tags are preserved in the database
    const processedStatement = formData.statement.trim();
    
    const quoteData = {
      ref: formData.reference,
      speaker: formData.speaker,
      collection: formData.collection,
      statements: [
        {
          statement: processedStatement,
          tags,
          keywords
        }
      ]
    };
    
    // Submit to API
    addQuote(quoteData);
    
    // Reset form
    setFormData({
      statement: '',
      reference: '',
      speaker: 'Śrīla Prabhupāda',
      collection: 'Mix',
      keywords: ''
    });
  };

  const getCollectionTag = (collection) => {
    const collectionMap = {
      'Bhagavad-gītā As It Is': 'quotecard:bgatis',
      'Śrīmad-Bhāgavatam': 'quotecard:sb',
      'Śrī Caitanya-caritāmṛta': 'quotecard:cc',
      'The Empowered Ācārya': 'quotecard:lila-amrita',
      'Superman': 'quotecard:superman'
    };
    return collectionMap[collection] || '';
  };

  if (!isAddQuoteModalOpen) return null;

  // Helper function to get collection color class
  const getCollectionColorClass = (collection) => {
    switch(collection) {
      case 'Superman': return 'superman-option';
      case 'The Empowered Ācārya': return 'lila-amrita-option';
      case 'Śrīmad-Bhāgavatam': return 'sb-option';
      case 'Śrī Caitanya-caritāmṛta': return 'cc-option';
      case 'Bhagavad-gītā As It Is': return 'bgatis-option';
      default: return '';
    }
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <span className="close-modal" onClick={toggleAddQuoteModal}>
          <FaTimes />
        </span>
        <h2>Add New Quote</h2>
        <form id="quoteForm" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="statement">Quote Text</label>
            <textarea 
              id="statement" 
              required 
              placeholder="Enter the quote text..."
              value={formData.statement}
              onChange={handleChange}
            ></textarea>
          </div>
          <div className="form-group">
            <label htmlFor="reference">Reference</label>
            <input 
              type="text" 
              id="reference" 
              required 
              placeholder="e.g., Śrīla Prabhupāda lecture on Bg 2.48 in New York in 1966"
              value={formData.reference}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="speaker">Speaker</label>
            <input 
              type="text" 
              id="speaker" 
              placeholder="e.g., Śrīla Prabhupāda" 
              value={formData.speaker}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="collection">Collection</label>
            <div className="collection-selector">
              {['Mix', 'Superman', 'The Empowered Ācārya', 'Śrīmad-Bhāgavatam', 'Śrī Caitanya-caritāmṛta', 'Bhagavad-gītā As It Is'].map(collection => (
                <div 
                  key={collection}
                  className={`collection-option ${getCollectionColorClass(collection)} ${formData.collection === collection ? 'selected' : ''}`}
                  onClick={() => setFormData({...formData, collection})}
                >
                  {collection}
                </div>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="keywords">Keywords (comma separated)</label>
            <input 
              type="text" 
              id="keywords" 
              placeholder="e.g., karma, duty, detachment"
              value={formData.keywords}
              onChange={handleChange}
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn submit-btn">Submit Quote</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddQuoteModal;