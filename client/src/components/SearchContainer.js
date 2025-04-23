import React from 'react';
import { FaSearch, FaSync, FaPlus } from 'react-icons/fa';
import FilterChips from './FilterChips';
import { useQuote } from '../context/QuoteContext';
import { useAuth } from '../context/AuthContext';
import './styles/SearchContainer.css';

const SearchContainer = () => {
  const { searchTerm, setSearchTerm, toggleAddQuoteModal, fetchQuotes } = useQuote();
  const { isAuthenticated, toggleLoginModal } = useAuth();

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleAddQuoteClick = () => {
    if (isAuthenticated) {
      toggleAddQuoteModal();
    } else {
      toggleLoginModal();
    }
  };

  const handleRefresh = () => {
    fetchQuotes();
  };

  return (
    <div className="search-container">
      <div className="container">
        <div className="search-filters-wrapper">
          <div className="search-wrapper">
            <input
              type="text"
              id="search"
              placeholder="Search by reference (BG, SB), keyword, or meaning..."
              value={searchTerm}
              onChange={handleSearchChange}
            />
            <FaSearch className="search-icon" />
          </div>
          <div className="actions">
            <button id="refreshBtn" className="btn refresh-btn" onClick={handleRefresh}>
              <FaSync /> Refresh
            </button>
            <button id="addQuoteBtn" className="btn add-quote-btn" onClick={handleAddQuoteClick}>
              <FaPlus /> Add Quote
            </button>
          </div>
        </div>

        <FilterChips />
      </div>
    </div>
  );
};

export default SearchContainer;