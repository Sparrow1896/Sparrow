import React, { useState, useEffect, createContext, useReducer, useContext } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

// Create context
export const QuoteContext = createContext();

// Initial state
const initialState = {
  quotes: [],
  flatQuotes: [], // Flattened quotes for display
  loading: true,
  error: null,
  filters: {
    topics: ["superman", "lila-amrita", "sb", "cc", "bgatis"],
    activeFilters: new Set()
  },
  searchTerm: '',
  currentResults: [],
  commonWords: {},
  isAddQuoteModalOpen: false,
  isSuggestionModalOpen: false,
  suggestions: [],
  toastMessage: ''
};

// Reducer
function quoteReducer(state, action) {
  switch (action.type) {
    case 'FETCH_QUOTES_SUCCESS':
      return {
        ...state,
        quotes: action.payload,
        loading: false,
        error: null
      };
    case 'PROCESS_QUOTES':
      return {
        ...state,
        flatQuotes: action.payload.flatQuotes,
        commonWords: action.payload.commonWords,
        currentResults: action.payload.flatQuotes,
        loading: false
      };
    case 'FETCH_QUOTES_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: true
      };
    case 'TOGGLE_FILTER':
      const newFilters = new Set(state.filters.activeFilters);
      if (newFilters.has(action.payload)) {
        newFilters.delete(action.payload);
      } else {
        newFilters.add(action.payload);
      }
      return {
        ...state,
        filters: {
          ...state.filters,
          activeFilters: newFilters
        }
      };
    case 'SET_SEARCH_TERM':
      return {
        ...state,
        searchTerm: action.payload
      };
    case 'SET_CURRENT_RESULTS':
      return {
        ...state,
        currentResults: action.payload
      };
    case 'TOGGLE_ADD_QUOTE_MODAL':
      return {
        ...state,
        isAddQuoteModalOpen: !state.isAddQuoteModalOpen
      };
    case 'ADD_QUOTE_SUCCESS':
      return {
        ...state,
        quotes: [action.payload, ...state.quotes],
        isAddQuoteModalOpen: false,
        loading: false
      };
    case 'ADD_QUOTE_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload
      };
    case 'SET_SUGGESTIONS':
      return {
        ...state,
        suggestions: action.payload,
        isSuggestionModalOpen: action.payload.length > 0
      };
    case 'TOGGLE_SUGGESTION_MODAL':
      return {
        ...state,
        isSuggestionModalOpen: !state.isSuggestionModalOpen
      };
    case 'SHOW_TOAST':
      return {
        ...state,
        toastMessage: action.payload
      };
    case 'HIDE_TOAST':
      return {
        ...state,
        toastMessage: ''
      };
    default:
      return state;
  }
}

// Provider component
export const QuoteProvider = ({ children }) => {
  const [state, dispatch] = useReducer(quoteReducer, initialState);

  // Fetch quotes
  // Fetch quotes function
  const fetchQuotes = async () => {
    try {
      dispatch({ type: 'SET_LOADING' });
      
      // Make the API call to fetch quotes
      const res = await axios.get('/api/quotes');
      
      // Log the response to help with debugging
      console.log('Quotes fetched:', res.data.length);
      
      // Dispatch success action with the fetched quotes
      dispatch({
        type: 'FETCH_QUOTES_SUCCESS',
        payload: res.data
      });
      
      // Process the quotes to create the flat structure
      processQuotes(res.data);
    } catch (err) {
      console.error('Error fetching quotes:', err);
      
      // Dispatch failure action with the error message
      dispatch({
        type: 'FETCH_QUOTES_FAILURE',
        payload: err.response?.data?.msg || 'Error fetching quotes'
      });
      
      // Show error toast
      toast.error(err.response?.data?.msg || 'Error fetching quotes');
    }
  };

  // Process quotes to flatten them and extract common words
  const processQuotes = (quotes) => {
    const flatQuotes = [];
    const topicSet = new Set(["superman", "lila-amrita", "sb", "cc", "bgatis"]);
    const wordMap = {};

    quotes.forEach(entry => {
      const scriptureInfo = extractScriptureInfo(entry.ref);

      entry.statements.forEach((item, index) => {
        if (!item.id) item.id = entry.ref.replace(/\s+/g, '') + "-" + index;

        const topics = [];
        if (item.tags && Array.isArray(item.tags)) {
          item.tags.forEach(tag => {
            // Normalize tag names to remove emojis and spaces
            let normalizedTag = tag;
            if (tag.includes("Superman")) normalizedTag = "superman";
            if (tag.includes("Lila-Amrita")) normalizedTag = "lila-amrita";
            if (tag.toLowerCase().includes("sb")) normalizedTag = "sb";
            if (tag.toLowerCase().includes("cc")) normalizedTag = "cc";
            if (tag.toLowerCase().includes("bgatis")) normalizedTag = "bgatis";

            topics.push(normalizedTag);
            topicSet.add(normalizedTag);
            addWordToMap(normalizedTag, wordMap);
          });
        }
        if (item.keywords && Array.isArray(item.keywords)) {
          item.keywords.forEach(keyword => {
            topics.push(keyword);
            topicSet.add(keyword);
            addWordToMap(keyword, wordMap);
          });
        }

        // Automatically tag quotes based on scriptureCode
        if (scriptureInfo.scriptureCode === "SB") {
          topics.push("sb");
          topicSet.add("sb");
        } else if (scriptureInfo.scriptureCode === "CC") {
          topics.push("cc");
          topicSet.add("cc");
        } else if (scriptureInfo.scriptureCode === "BG") {
          topics.push("bgatis");
          topicSet.add("bgatis");
        }

        flatQuotes.push({
          ...item,
          ref: entry.ref,
          topics: topics,
          scriptureCode: scriptureInfo.scriptureCode,
          chapter: scriptureInfo.chapter,
          verse: scriptureInfo.verse,
          speaker: entry.speaker || "",
          lecture: entry.lecture || "",
          collection: entry.collection || "Mix"
        });

        const words = item.statement.toLowerCase().split(/\W+/).filter(w => w.length > 3);
        words.forEach(word => addWordToMap(word, wordMap));
      });
    });

    dispatch({
      type: 'PROCESS_QUOTES',
      payload: {
        flatQuotes,
        commonWords: wordMap
      }
    });
  };

  // Helper function to add word to map
  const addWordToMap = (word, map) => {
    word = word.toLowerCase().trim();
    if (word.length > 2) {
      map[word] = (map[word] || 0) + 1;
    }
  };

  // Helper function to extract scripture info
  const extractScriptureInfo = (ref) => {
    const info = { scriptureCode: "", chapter: "", verse: "" };

    const scripturePatterns = [
      { pattern: /\bBG\b|Bhagavad-gītā|Bhagavad-gita/i, code: "BG" },
      { pattern: /\bSB\b|Śrīmad-Bhāgavatam|Srimad-Bhagavatam/i, code: "SB" },
      { pattern: /\bCC\b|Caitanya-caritāmṛta|Caitanya-caritamrta/i, code: "CC" },
      { pattern: /\bNOD\b|Nectar of Devotion/i, code: "NOD" },
      { pattern: /\bISO\b|Īśopaniṣad|Isopanisad/i, code: "ISO" }
    ];

    for (const pattern of scripturePatterns) {
      if (pattern.pattern.test(ref)) {
        info.scriptureCode = pattern.code;
        break;
      }
    }

    const chapterVersePattern = /(\d+)\.(\d+)/;
    const chapterVerseMatch = ref.match(chapterVersePattern);

    if (chapterVerseMatch) {
      info.chapter = chapterVerseMatch[1];
      info.verse = chapterVerseMatch[2];
    } else {
      const chapterPattern = /chapter (\d+)|lecture on .* (\d+)/i;
      const chapterMatch = ref.match(chapterPattern);
      if (chapterMatch) info.chapter = chapterMatch[1] || chapterMatch[2];
    }

    return info;
  };

  // Toggle filter function - fixed to work on first click
  const toggleFilter = (topic) => {
    // First dispatch the action to update the filter state
    dispatch({
      type: 'TOGGLE_FILTER',
      payload: topic
    });

    // Create a copy of the activeFilters set with the toggled topic
    const updatedFilters = new Set(state.filters.activeFilters);
    if (updatedFilters.has(topic)) {
      updatedFilters.delete(topic);
    } else {
      updatedFilters.add(topic);
    }

    // Filter quotes with the updated filters
    const term = state.searchTerm.trim();
    let results = [];

    if (updatedFilters.size === 0) {
      // If no filters active, show all quotes or search results
      results = term ? enhancedSearch(term) : state.flatQuotes;
    } else {
      // Filter quotes based on active filters
      let filteredQuotes = state.flatQuotes;

      // If there's a search term, start with those results instead
      if (term) {
        filteredQuotes = enhancedSearch(term);
      }

      // Then filter by the active filter topics
      results = filteredQuotes.filter(quote => {
        // Check if quote has tags that match any active filter
        if (quote.tags && Array.isArray(quote.tags)) {
          return Array.from(updatedFilters).some(filter => {
            if (filter === "superman") {
              return quote.tags.some(tag => tag.toLowerCase().includes("superman"));
            } else if (filter === "lila-amrita") {
              return quote.tags.some(tag =>
                tag.toLowerCase().includes("quotecard:lila-amrita") ||
                tag.toLowerCase().includes("quote-card:lila-amrita")
              );
            } else if (filter === "sb") {
              return quote.tags.some(tag =>
                tag.toLowerCase().includes("quotecard:sb") ||
                tag.toLowerCase().includes("quote-card:sb")
              ) || quote.scriptureCode === "SB";
            } else if (filter === "cc") {
              return quote.tags.some(tag =>
                tag.toLowerCase().includes("quotecard:cc") ||
                tag.toLowerCase().includes("quote-card:cc")
              ) || quote.scriptureCode === "CC";
            } else if (filter === "bgatis") {
              return quote.tags.some(tag =>
                tag.toLowerCase().includes("quotecard:bgatis") ||
                tag.toLowerCase().includes("quote-card:bgatis") ||
                tag.toLowerCase().includes("quotecard:bgats")
              ) || quote.scriptureCode === "BG";
            }
            return false;
          });
        }
        return false;
      });
    }

    // Update the current results
    dispatch({ type: 'SET_CURRENT_RESULTS', payload: results });

    // If no results and there's a search term, find similar words
    if (results.length === 0 && term.length > 0) {
      findSimilarWords(term);
    } else {
      dispatch({ type: 'SET_SUGGESTIONS', payload: [] });
    }
  };

  // Set search term
  const setSearchTerm = (term) => {
    dispatch({ type: 'SET_SEARCH_TERM', payload: term });

    // Filter quotes with the updated search term
    const updatedFilters = state.filters.activeFilters;
    const results = filterQuotesWithTerm(term, updatedFilters);

    dispatch({ type: 'SET_CURRENT_RESULTS', payload: results });

    // If no results and there's a search term, find similar words
    if (results.length === 0 && term.trim().length > 0) {
      findSimilarWords(term);
    } else {
      dispatch({ type: 'SET_SUGGESTIONS', payload: [] });
    }
  };

  // Helper function to filter quotes with a specific term and filters
  const filterQuotesWithTerm = (term, activeFilters) => {
    term = term.trim();

    if (activeFilters.size === 0) {
      // If no filters active, show all quotes or search results
      return term ? enhancedSearch(term) : state.flatQuotes;
    } else {
      // Filter quotes based on active filters
      let filteredQuotes = state.flatQuotes;

      // If there's a search term, start with those results instead
      if (term) {
        filteredQuotes = enhancedSearch(term);
      }

      // Then filter by the active filter topics
      return filteredQuotes.filter(quote => {
        // Check if quote has tags that match any active filter
        if (quote.tags && Array.isArray(quote.tags)) {
          return Array.from(activeFilters).some(filter => {
            if (filter === "superman") {
              return quote.tags.some(tag => tag.toLowerCase().includes("superman"));
            } else if (filter === "lila-amrita") {
              return quote.tags.some(tag =>
                tag.toLowerCase().includes("quotecard:lila-amrita") ||
                tag.toLowerCase().includes("quote-card:lila-amrita")
              );
            } else if (filter === "sb") {
              return quote.tags.some(tag =>
                tag.toLowerCase().includes("quotecard:sb") ||
                tag.toLowerCase().includes("quote-card:sb")
              ) || quote.scriptureCode === "SB";
            } else if (filter === "cc") {
              return quote.tags.some(tag =>
                tag.toLowerCase().includes("quotecard:cc") ||
                tag.toLowerCase().includes("quote-card:cc")
              ) || quote.scriptureCode === "CC";
            } else if (filter === "bgatis") {
              return quote.tags.some(tag =>
                tag.toLowerCase().includes("quotecard:bgatis") ||
                tag.toLowerCase().includes("quote-card:bgatis") ||
                tag.toLowerCase().includes("quotecard:bgats")
              ) || quote.scriptureCode === "BG";
            }
            return false;
          });
        }
        return false;
      });
    }
  };

  // Enhanced search function
  const enhancedSearch = (query) => {
    query = query.toLowerCase();
    let keywords = [];
    let phrases = extractPhrases(query);

    const remainingQuery = query.replace(/"([^"]*)"/g, '').trim();
    keywords = remainingQuery.split(/\s+/).filter(k => k.length > 0);

    let quotesToSearch = state.flatQuotes;
    if (state.filters.activeFilters.size > 0) {
      quotesToSearch = state.flatQuotes.filter(quote =>
        quote.topics && quote.topics.some(topic =>
          state.filters.activeFilters.has(topic)
        )
      );
    }

    const scriptureReferencePattern = /^(bg|sb|cc|iso)\s*(\d+)(?:\.(\d+))?$/i;
    const scriptureRefMatch = query.match(scriptureReferencePattern);

    if (scriptureRefMatch) {
      const scriptureCode = scriptureRefMatch[1].toUpperCase();
      const chapter = scriptureRefMatch[2];
      const verse = scriptureRefMatch[3] || "";

      return quotesToSearch.filter(quote => {
        if (quote.scriptureCode === scriptureCode) {
          if (verse) return quote.chapter === chapter && quote.verse === verse;
          else return quote.chapter === chapter;
        }
        return false;
      });
    }

    return quotesToSearch
      .map(quote => {
        const statement = quote.statement.toLowerCase();
        const refText = quote.ref.toLowerCase();
        let score = 0;

        if (refText.includes(query)) score += 15;
        if (quote.scriptureCode && query.toUpperCase() === quote.scriptureCode) score += 15;

        phrases.forEach(phrase => {
          if (statement.includes(phrase)) score += 10;
        });

        keywords.forEach(keyword => {
          const wordRegex = new RegExp(`\\b${keyword}\\b`, 'i');
          if (wordRegex.test(statement)) score += 3;
          else if (statement.includes(keyword)) score += 1;
          if (refText.includes(keyword)) score += 4;
          if (quote.speaker && quote.speaker.toLowerCase().includes(keyword)) score += 3;
          if (quote.lecture && quote.lecture.toLowerCase().includes(keyword)) score += 3;
        });

        if (statement.includes(remainingQuery)) score += 5;

        if (quote.tags) {
          [...keywords, ...phrases].forEach(term => {
            if (quote.tags.some(tag => tag.toLowerCase().includes(term))) score += 2;
          });
        }

        if (quote.keywords) {
          [...keywords, ...phrases].forEach(term => {
            if (quote.keywords.some(k => k.toLowerCase().includes(term))) score += 2;
          });
        }

        return { ...quote, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);
  };

  // Helper function to extract phrases from query
  const extractPhrases = (query) => {
    const phrases = [];
    const phraseRegex = /"([^"]*)"/g;
    let match;

    while ((match = phraseRegex.exec(query)) !== null) {
      phrases.push(match[1].toLowerCase());
    }

    return phrases;
  };

  // Find similar words for suggestions
  const findSimilarWords = (word) => {
    word = word.toLowerCase();
    if (word.length < 3) return [];

    const words = word.split(/\s+/).filter(w => w.length > 2);

    if (words.length === 0) {
      dispatch({ type: 'SET_SUGGESTIONS', payload: [] });
      return;
    }

    const similarWords = words.flatMap(w => {
      const allWords = Object.keys(state.commonWords).filter(w => w.length >= 3);
      return allWords
        .map(w2 => ({
          word: w2,
          similarity: calculateSimilarity(w, w2),
          frequency: state.commonWords[w2]
        }))
        .filter(item => item.similarity > 0.6)
        .sort((a, b) => b.similarity - a.similarity || b.frequency - a.frequency)
        .slice(0, 3)
        .map(item => item.word);
    });

    dispatch({ type: 'SET_SUGGESTIONS', payload: similarWords });
  };

  // Calculate similarity between two strings (Levenshtein distance)
  const calculateSimilarity = (s1, s2) => {
    if (s1 === s2) return 1.0;
    if (s1.length < 2 || s2.length < 2) return 0.0;

    if (s1.includes(s2) || s2.includes(s1)) {
      return 0.8;
    }

    let longer = s1, shorter = s2;
    if (s1.length < s2.length) {
      longer = s2;
      shorter = s1;
    }

    const editDistance = levenshteinDistance(s1, s2);
    return (longer.length - editDistance) / parseFloat(longer.length);
  };

  // Levenshtein distance calculation
  const levenshteinDistance = (s1, s2) => {
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) costs[j] = j;
        else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1))
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  };

  // Toggle add quote modal
  const toggleAddQuoteModal = () => {
    dispatch({ type: 'TOGGLE_ADD_QUOTE_MODAL' });
  };

  // Toggle suggestion modal
  const toggleSuggestionModal = () => {
    dispatch({ type: 'TOGGLE_SUGGESTION_MODAL' });
  };

  // Select a suggestion
  const selectSuggestion = (word) => {
    dispatch({ type: 'SET_SEARCH_TERM', payload: word });
    dispatch({ type: 'SET_SUGGESTIONS', payload: [] });
    const results = filterQuotesWithTerm(word, state.filters.activeFilters);
    dispatch({ type: 'SET_CURRENT_RESULTS', payload: results });
  };

  // Add a new quote
  const addQuote = async (quoteData) => {
    try {
      dispatch({ type: 'SET_LOADING' });

      const res = await axios.post('/api/quotes', quoteData);

      dispatch({
        type: 'ADD_QUOTE_SUCCESS',
        payload: res.data
      });

      // Re-process quotes to update the flat quotes
      processQuotes([res.data, ...state.quotes]);

      // Show success toast
      toast.success('Quote added successfully!');
    } catch (err) {
      dispatch({
        type: 'ADD_QUOTE_FAILURE',
        payload: err.response?.data?.msg || 'Error adding quote'
      });
      toast.error(err.response?.data?.msg || 'Error adding quote');
    }
  };

  // Show toast message
  const showToast = (message) => {
    dispatch({ type: 'SHOW_TOAST', payload: message });
    setTimeout(() => {
      dispatch({ type: 'HIDE_TOAST' });
    }, 3000);
  };

  // Initialize admin user
  const initializeAdmin = async () => {
    try {
      const res = await axios.post('/api/users/init');
      console.log('Admin initialization response:', res.data);
    } catch (err) {
      console.log('Admin user already initialized');
    }
  };

  // Copy to clipboard function
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        showToast('Quote copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        showToast('Failed to copy quote');
      });
  };

  // Effect to fetch quotes on mount
  useEffect(() => {
    fetchQuotes();
  }, []);

  return (
    <QuoteContext.Provider
      value={{
        quotes: state.quotes,
        flatQuotes: state.flatQuotes,
        loading: state.loading,
        error: state.error,
        filters: state.filters,
        searchTerm: state.searchTerm,
        currentResults: state.currentResults,
        commonWords: state.commonWords,
        isAddQuoteModalOpen: state.isAddQuoteModalOpen,
        isSuggestionModalOpen: state.isSuggestionModalOpen,
        suggestions: state.suggestions,
        toastMessage: state.toastMessage,
        fetchQuotes,
        toggleFilter,
        setSearchTerm,
        toggleAddQuoteModal,
        toggleSuggestionModal,
        selectSuggestion,
        addQuote,
        showToast,
        copyToClipboard,
        initializeAdmin
      }}
    >
      {children}
    </QuoteContext.Provider>
  );
};

// Create hook
export const useQuote = () => {
  return useContext(QuoteContext);
};