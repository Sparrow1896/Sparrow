import React from 'react';
import { useQuote } from '../context/QuoteContext';
import './styles/FilterChips.css';

const FilterChips = () => {
  const { filters, toggleFilter } = useQuote();

  // Text labels for display with new filter names
  const filterLabels = {
    "superman": "Superman 🦸‍♂️", 
    "lila-amrita": "🔥 The Empowered Ācārya 🔥", 
    "sb": "Śrīmad Bhāgavatam",
    "cc": "Śrī Caitanya-caritāmṛta",
    "bgatis": "Bhagavad-gītā As It Is"
  };

  // Primary filters in preferred order
  const primaryFilters = ["lila-amrita", "sb", "cc", "bgatis", "superman"];

  const handleFilterClick = (e, topic) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFilter(topic);
  };

  return (
    <div className="filters">
      {primaryFilters.map(topic => (
        <div 
          key={topic}
          className={`filter-chip ${filters.activeFilters.has(topic) ? 'active' : ''}`}
          data-topic={topic}
          onClick={(e) => handleFilterClick(e, topic)}
        >
          {filterLabels[topic] || topic}
        </div>
      ))}
    </div>
  );
};

export default FilterChips;