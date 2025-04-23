import React from 'react';
import { FaCopy } from 'react-icons/fa';
import { useQuote } from '../context/QuoteContext';
import './styles/QuoteCard.css';

const QuoteCard = ({ quote }) => {
  const { copyToClipboard } = useQuote();

  // Determine the appropriate class based on tags
  const getCardClass = () => {
    // First check for specific quotecard tags with strict matching
    if (quote.tags && Array.isArray(quote.tags)) {
      // Check for Bhagavad-gītā As It Is tags
      if (quote.tags.some(tag => 
        tag.toLowerCase() === "quotecard:bgatis" || 
        tag.toLowerCase() === "quotecard:bgats"
      )) {
        return "bgatis";
      } 
      // Check for Śrīmad-Bhāgavatam tags
      else if (quote.tags.some(tag => 
        tag.toLowerCase() === "quotecard:sb"
      )) {
        return "sb";
      } 
      // Check for Śrī Caitanya-caritāmṛta tags
      else if (quote.tags.some(tag => 
        tag.toLowerCase() === "quotecard:cc"
      )) {
        return "cc";
      } 
      // Check for The Empowered Ācārya tags
      else if (quote.tags.some(tag => 
        tag.toLowerCase() === "quotecard:lila-amrita"
      )) {
        return "lila-amrita";
      } 
      // Check for Superman tags
      else if (quote.tags.some(tag => 
        tag.toLowerCase() === "quotecard:superman" ||
        tag.toLowerCase() === "superman"
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
    
    // If the quote has a collection property, use that
    if (quote.collection) {
      if (quote.collection === "Bhagavad-gītā As It Is") return "bgatis";
      if (quote.collection === "Śrīmad-Bhāgavatam") return "sb";
      if (quote.collection === "Śrī Caitanya-caritāmṛta") return "cc";
      if (quote.collection === "The Empowered Ācārya") return "lila-amrita";
      if (quote.collection === "Superman") return "superman";
    }
    
    return ""; // Default class
  };

  const handleCopy = (e) => {
    e.stopPropagation();
    copyToClipboard(`"${quote.statement}" — ${quote.ref}`);
  };

  // Function to safely convert <br> tags to actual line breaks
  const formatStatement = (text) => {
    return { __html: text.replace(/<br>/g, '<br />') };
  };

  return (
    <div className={`quote-card ${getCardClass()}`}>
      <div className="statement" dangerouslySetInnerHTML={formatStatement(quote.statement)}></div>
      <div className="ref">— {quote.ref}</div>
      <button className="copy-btn" title="Copy quote" onClick={handleCopy}>
        <FaCopy />
      </button>
    </div>
  );
};

export default QuoteCard;