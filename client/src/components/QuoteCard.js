import React from 'react';
import { FaCopy } from 'react-icons/fa';
import { useQuote } from '../context/QuoteContext';
import './styles/QuoteCard.css';

const QuoteCard = ({ quote }) => {
  const { copyToClipboard } = useQuote();

  // Determine the appropriate class based on tags
  const getCardClass = () => {
    if (quote.tags && Array.isArray(quote.tags)) {
      // Check for specific tags with more flexible matching
      if (quote.tags.some(tag => 
        tag.toLowerCase().includes("quotecard:bgatis") || 
        tag.toLowerCase().includes("quote-card:bgatis") ||
        tag.toLowerCase().includes("quotecard:bgats")
      )) {
        return "bgatis";
      } else if (quote.tags.some(tag => 
        tag.toLowerCase().includes("quotecard:sb") || 
        tag.toLowerCase().includes("quote-card:sb")
      )) {
        return "sb";
      } else if (quote.tags.some(tag => 
        tag.toLowerCase().includes("quotecard:cc") || 
        tag.toLowerCase().includes("quote-card:cc")
      )) {
        return "cc";
      } else if (quote.tags.some(tag => 
        tag.toLowerCase().includes("quotecard:lila-amrita") || 
        tag.toLowerCase().includes("quote-card:lila-amrita")
      )) {
        return "lila-amrita";
      } else if (quote.tags.some(tag => 
        tag.toLowerCase().includes("superman")
      )) {
        return "superman";
      }
    }
    
    // If no specific tag is found, check if the quote has a scriptureCode
    if (quote.scriptureCode) {
      if (quote.scriptureCode === "BG") return "bgatis";
      if (quote.scriptureCode === "SB") return "sb";
      if (quote.scriptureCode === "CC") return "cc";
    }
    
    return ""; // Default class
  };

  const handleCopy = (e) => {
    e.stopPropagation();
    copyToClipboard(`"${quote.statement}" — ${quote.ref}`);
  };

  return (
    <div className={`quote-card ${getCardClass()}`}>
      <div className="statement">{quote.statement}</div>
      <div className="ref">— {quote.ref}</div>
      <button className="copy-btn" title="Copy quote" onClick={handleCopy}>
        <FaCopy />
      </button>
    </div>
  );
};

export default QuoteCard;