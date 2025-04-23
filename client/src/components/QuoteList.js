import React from 'react';
import QuoteCard from './QuoteCard';
import { useQuote } from '../context/QuoteContext';
import './styles/QuoteList.css';

const QuoteList = () => {
  const { currentResults, loading } = useQuote();

  if (loading) {
    return (
      <div id="loading" className="loading">
        <div className="loading-spinner"></div>
        Finding quotes...
      </div>
    );
  }

  if (currentResults.length === 0) {
    return <div className="no-results">No matching quotes found</div>;
  }

  return (
    <div id="results" className="results">
      {currentResults.map(quote => (
        <QuoteCard key={quote.id} quote={quote} />
      ))}
    </div>
  );
};

export default QuoteList;