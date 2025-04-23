import React from 'react';
import { useQuote } from '../context/QuoteContext';

const SuggestionModal = () => {
  const { 
    isSuggestionModalOpen, 
    suggestions, 
    toggleSuggestionModal, 
    selectSuggestion 
  } = useQuote();

  if (!isSuggestionModalOpen || suggestions.length === 0) return null;

  const handleSuggestionClick = (word) => {
    selectSuggestion(word);
  };

  return (
    <div id="suggestions" className="suggestions-modal" style={{ display: 'block' }}>
      <div className="suggestion-title">Did you mean:</div>
      <div className="suggestions-list">
        {suggestions.map((word, index) => (
          <span 
            key={index} 
            className="suggestion-word" 
            onClick={() => handleSuggestionClick(word)}
          >
            {word}
          </span>
        ))}
      </div>
    </div>
  );
};

export default SuggestionModal;