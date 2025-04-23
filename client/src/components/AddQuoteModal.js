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
      if (!tags.includes(collectionTag)) {
        tags.push(collectionTag);
      }
    }
    
    // Add keywords as tags if they're not already there
    keywords.forEach(keyword => {
      if (!tags.includes(keyword)) {
        tags.push(keyword);
      }
    });
    
    const quoteData = {
      ref: formData.reference,
      speaker: formData.speaker,
      collection: formData.collection,
      statements: [
        {
          statement: formData.statement,
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
            <select 
              id="collection"
              value={formData.collection}
              onChange={handleChange}
              required
            >
              <option value="Mix">General</option>
              <option value="Superman">Superman</option>
              <option value="The Empowered Ācārya">The Empowered Ācārya</option>
              <option value="Śrīmad-Bhāgavatam">Śrīmad Bhāgavatam</option>
              <option value="Śrī Caitanya-caritāmṛta">Śrī Caitanya-caritāmṛta</option>
              <option value="Bhagavad-gītā As It Is">Bhagavad-gītā As It Is</option>
            </select>
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