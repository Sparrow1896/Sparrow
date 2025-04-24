import axios from 'axios';
import { toast } from 'react-toastify';

// Configure axios with base URL and timeout settings
const api = axios.create({
  baseURL: process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000',
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add a request interceptor for debugging
api.interceptors.request.use(config => {
  console.log(`API Request: ${config.method.toUpperCase()} ${config.baseURL}${config.url}`);
  return config;
}, error => {
  return Promise.reject(error);
});

// Add a response interceptor for debugging
api.interceptors.response.use(response => {
  console.log(`API Response: ${response.status} ${response.config.method.toUpperCase()} ${response.config.url}`);
  return response;
}, error => {
  if (error.response) {
    console.error(`API Error: ${error.response.status} ${error.config.method.toUpperCase()} ${error.config.url}`);
  } else {
    console.error(`API Error: ${error.message}`);
  }
  return Promise.reject(error);
});

// Track if we're in fallback mode
let usingFallbackData = false;

// Store the fallback data once loaded
let fallbackQuotesData = null;

/**
 * Load quotes from local JSON file
 * @returns {Promise} Promise that resolves to the quotes data from local file
 */
const loadQuotesFromFile = async () => {
  try {
    // First check if we have cached data in localStorage
    const cachedData = localStorage.getItem('fallbackQuotesData');
    if (cachedData) {
      try {
        fallbackQuotesData = JSON.parse(cachedData);
        console.log('Quotes loaded from localStorage cache:', fallbackQuotesData.length);
        return fallbackQuotesData;
      } catch (parseError) {
        console.error('Error parsing cached quotes data:', parseError);
        // Continue to fetch from file if parsing fails
      }
    }
    
    // If no cached data or parsing failed, load from file
    if (fallbackQuotesData) {
      return fallbackQuotesData; // Return cached data if available
    }
    
    console.log('Loading quotes from local file...');
    const response = await fetch('/quotes.json');
    if (!response.ok) {
      throw new Error(`Failed to load local quotes file: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Quotes loaded from local file:', data.length);
    
    // Cache the data for future use
    fallbackQuotesData = data;
    localStorage.setItem('fallbackQuotesData', JSON.stringify(data));
    return data;
  } catch (error) {
    console.error('Error loading quotes from file:', error);
    throw error;
  }
};

/**
 * Fetch all quotes from the API with fallback to local file
 * @returns {Promise} Promise that resolves to the quotes data
 */
export const fetchAllQuotes = async () => {
  try {
    // If we're already in fallback mode, go straight to file
    if (usingFallbackData) {
      console.log('Using fallback data source (local file)');
      return await loadQuotesFromFile();
    }
    
    // Try the API first with retry logic
    let retries = 2;
    let lastError = null;
    
    while (retries > 0) {
      try {
        const response = await api.get('/api/quotes');
        console.log('Quotes fetched successfully from API:', response.data.length);
        usingFallbackData = false; // Reset fallback flag if API works
        
        // Update fallback data with the latest from API
        fallbackQuotesData = response.data;
        localStorage.setItem('fallbackQuotesData', JSON.stringify(fallbackQuotesData));
        
        // Check for offline changes that need to be synced
        const offlineQuotes = JSON.parse(localStorage.getItem('offlineQuotes') || '[]');
        const deletedQuotes = JSON.parse(localStorage.getItem('offlineDeletedQuotes') || '[]');
        
        if (offlineQuotes.length > 0 || deletedQuotes.length > 0) {
          console.log('Found offline changes, attempting to sync...');
          syncOfflineChanges();
        }
        
        return response.data;
      } catch (error) {
        lastError = error;
        if (error.code === 'ERR_NETWORK') {
          console.log(`Network error, retrying... (${retries} attempts left)`);
          retries--;
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          // For non-network errors, don't retry
          throw error;
        }
      }
    }
    
    // If we've exhausted all retries, switch to fallback
    console.log('Switching to fallback data source after failed API attempts');
    usingFallbackData = true;
    toast.info('Using offline mode: quotes loaded from local storage');
    return await loadQuotesFromFile();
  } catch (error) {
    console.error('Error fetching quotes:', error);
    
    // Try fallback as last resort
    try {
      console.log('Attempting to load from fallback source');
      usingFallbackData = true;
      toast.info('Using offline mode: quotes loaded from local storage');
      return await loadQuotesFromFile();
    } catch (fallbackError) {
      console.error('Critical error: Both API and fallback failed:', fallbackError);
      throw error; // Throw original error if fallback also fails
    }
  }
};


/**
 * Fetch quotes by collection
 * @param {string} collection - The collection name to filter by
 * @returns {Promise} Promise that resolves to the filtered quotes data
 */
export const fetchQuotesByCollection = async (collection) => {
  try {
    // If we're in fallback mode, filter from local data
    if (usingFallbackData) {
      console.log(`Filtering local quotes by collection: ${collection}`);
      const allQuotes = await loadQuotesFromFile();
      return allQuotes.filter(quote => quote.collection === collection);
    }
    
    // Try API first
    try {
      const response = await api.get(`/api/quotes?collection=${collection}`);
      return response.data;
    } catch (error) {
      // If API fails, switch to fallback
      if (error.code === 'ERR_NETWORK') {
        console.log('Network error, switching to fallback data for collection filtering');
        usingFallbackData = true;
        toast.info('Using offline mode: quotes loaded from local storage');
        const allQuotes = await loadQuotesFromFile();
        return allQuotes.filter(quote => quote.collection === collection);
      }
      throw error;
    }
  } catch (error) {
    console.error(`Error fetching quotes from collection ${collection}:`, error);
    throw error;
  }
};

/**
 * Search quotes by term
 * @param {string} searchTerm - The search term
 * @returns {Promise} Promise that resolves to the search results
 */
export const searchQuotes = async (searchTerm) => {
  try {
    // If we're in fallback mode, search in local data
    if (usingFallbackData) {
      console.log(`Searching local quotes for term: ${searchTerm}`);
      const allQuotes = await loadQuotesFromFile();
      const term = searchTerm.toLowerCase();
      return allQuotes.filter(quote => {
        // Simple search implementation for fallback mode
        const statementMatches = quote.statements.some(s => 
          s.statement.toLowerCase().includes(term));
        const refMatch = quote.ref.toLowerCase().includes(term);
        const speakerMatch = quote.speaker && quote.speaker.toLowerCase().includes(term);
        return statementMatches || refMatch || speakerMatch;
      });
    }
    
    // Try API first
    try {
      const response = await api.get(`/api/quotes?search=${encodeURIComponent(searchTerm)}`);
      return response.data;
    } catch (error) {
      // If API fails, switch to fallback
      if (error.code === 'ERR_NETWORK') {
        console.log('Network error, switching to fallback data for search');
        usingFallbackData = true;
        toast.info('Using offline mode: quotes loaded from local storage');
        const allQuotes = await loadQuotesFromFile();
        const term = searchTerm.toLowerCase();
        return allQuotes.filter(quote => {
          const statementMatches = quote.statements.some(s => 
            s.statement.toLowerCase().includes(term));
          const refMatch = quote.ref.toLowerCase().includes(term);
          const speakerMatch = quote.speaker && quote.speaker.toLowerCase().includes(term);
          return statementMatches || refMatch || speakerMatch;
        });
      }
      throw error;
    }
  } catch (error) {
    console.error(`Error searching quotes with term "${searchTerm}":`, error);
    throw error;
  }
};

/**
 * Add a new quote
 * @param {Object} quoteData - The quote data to add
 * @returns {Promise} Promise that resolves to the added quote
 */
export const addQuote = async (quoteData) => {
  try {
    // Try API first
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await api.post('/api/quotes', quoteData, {
        headers: {
          'x-auth-token': token
        }
      });
      return response.data;
    } catch (error) {
      // If API fails due to network error, use fallback
      if (error.code === 'ERR_NETWORK') {
        console.log('Network error, using fallback for adding quote');
        usingFallbackData = true;
        toast.info('Using offline mode: quote saved to local storage');
        
        // Get existing quotes from localStorage or initialize empty array
        let localQuotes = JSON.parse(localStorage.getItem('offlineQuotes') || '[]');
        
        // Add new quote with temporary ID
        const newQuote = {
          ...quoteData,
          _id: `temp_${Date.now()}`,
          createdAt: new Date().toISOString(),
          offlineCreated: true
        };
        
        localQuotes.push(newQuote);
        localStorage.setItem('offlineQuotes', JSON.stringify(localQuotes));
        
        toast.success('Quote saved locally. Will sync when connection is restored.');
        return newQuote;
      }
      throw error;
    }
  } catch (error) {
    console.error('Error adding quote:', error);
    throw error;
  }
};

/**
 * Delete a quote
 * @param {string} quoteId - The ID of the quote to delete
 * @returns {Promise} Promise that resolves when the quote is deleted
 */
export const deleteQuote = async (quoteId) => {
  try {
    // Try API first
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await api.delete(`/api/quotes/${quoteId}`, {
        headers: {
          'x-auth-token': token
        }
      });
      
      // Also remove from local fallback data if it exists
      if (fallbackQuotesData) {
        fallbackQuotesData = fallbackQuotesData.filter(quote => quote._id !== quoteId);
        // Update the local quotes.json file with the updated data
        localStorage.setItem('fallbackQuotesData', JSON.stringify(fallbackQuotesData));
      }
      
      return response.data;
    } catch (error) {
      // If API fails due to network error, use fallback
      if (error.code === 'ERR_NETWORK') {
        console.log('Network error, using fallback for deleting quote');
        usingFallbackData = true;
        toast.info('Using offline mode: deletion tracked locally');
        
        // Get existing deleted quotes from localStorage or initialize empty array
        let deletedQuotes = JSON.parse(localStorage.getItem('offlineDeletedQuotes') || '[]');
        
        // Add quote ID to deleted list
        deletedQuotes.push({
          quoteId,
          deletedAt: new Date().toISOString()
        });
        
        localStorage.setItem('offlineDeletedQuotes', JSON.stringify(deletedQuotes));
        
        // Also remove from local fallback data if it exists
        if (fallbackQuotesData) {
          fallbackQuotesData = fallbackQuotesData.filter(quote => quote._id !== quoteId);
          // Update the local storage with the updated data
          localStorage.setItem('fallbackQuotesData', JSON.stringify(fallbackQuotesData));
        }
        
        toast.success('Quote marked for deletion. Will sync when connection is restored.');
        return { success: true, message: 'Quote marked for deletion locally' };
      }
      throw error;
    }
  } catch (error) {
    console.error(`Error deleting quote ${quoteId}:`, error);
    throw error;
  }
};

/**
 * Sync offline changes when connection is restored
 * @returns {Promise} Promise that resolves when sync is complete
 */
export const syncOfflineChanges = async () => {
  try {
    // Check if we have a connection
    try {
      await api.get('/api/health');
    } catch (error) {
      console.log('Still offline, cannot sync changes');
      return { success: false, message: 'Still offline' };
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
      return { success: false, message: 'Authentication required for sync' };
    }
    
    // Sync new quotes
    const offlineQuotes = JSON.parse(localStorage.getItem('offlineQuotes') || '[]');
    if (offlineQuotes.length > 0) {
      console.log(`Syncing ${offlineQuotes.length} offline quotes to server...`);
      for (const quote of offlineQuotes) {
        try {
          // Remove temporary properties
          const { _id, offlineCreated, ...quoteData } = quote;
          
          await api.post('/api/quotes', quoteData, {
            headers: { 'x-auth-token': token }
          });
          console.log(`Synced quote: ${quoteData.ref}`);
        } catch (error) {
          console.error('Error syncing offline quote:', error);
        }
      }
      
      // Clear synced quotes
      localStorage.removeItem('offlineQuotes');
    }
    
    // Sync deleted quotes
    const deletedQuotes = JSON.parse(localStorage.getItem('offlineDeletedQuotes') || '[]');
    if (deletedQuotes.length > 0) {
      console.log(`Syncing ${deletedQuotes.length} deleted quotes to server...`);
      for (const { quoteId } of deletedQuotes) {
        try {
          await api.delete(`/api/quotes/${quoteId}`, {
            headers: { 'x-auth-token': token }
          });
          console.log(`Synced deletion of quote ID: ${quoteId}`);
        } catch (error) {
          console.error(`Error syncing deleted quote ${quoteId}:`, error);
        }
      }
      
      // Clear synced deletions
      localStorage.removeItem('offlineDeletedQuotes');
    }
    
    // Refresh fallback data after sync
    try {
      const response = await api.get('/api/quotes');
      fallbackQuotesData = response.data;
      localStorage.setItem('fallbackQuotesData', JSON.stringify(fallbackQuotesData));
      console.log('Updated local cache with latest data from server');
    } catch (error) {
      console.error('Error refreshing local cache:', error);
    }
    
    usingFallbackData = false;
    toast.success('Offline changes synced successfully');
    return { success: true, message: 'Sync completed' };
  } catch (error) {
    console.error('Error syncing offline changes:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Get the count of quotes in different sources
 * @returns {Promise} Promise that resolves to an object with counts
 */
export const getQuoteCounts = async () => {
  try {
    const counts = {
      mongodb: 0,
      localFile: 0,
      localStorage: 0,
      offlineQuotes: 0,
      offlineDeletedQuotes: 0
    };
    
    // Try to get MongoDB count
    try {
      const response = await api.get('/api/quotes/count');
      counts.mongodb = response.data.count;
    } catch (error) {
      console.log('Could not get MongoDB quote count:', error.message);
    }
    
    // Get local file count
    try {
      const response = await fetch('/quotes.json');
      if (response.ok) {
        const data = await response.json();
        counts.localFile = data.length;
      }
    } catch (error) {
      console.log('Could not get local file quote count:', error.message);
    }
    
    // Get localStorage counts
    try {
      const cachedData = localStorage.getItem('fallbackQuotesData');
      if (cachedData) {
        counts.localStorage = JSON.parse(cachedData).length;
      }
      
      const offlineQuotes = localStorage.getItem('offlineQuotes');
      if (offlineQuotes) {
        counts.offlineQuotes = JSON.parse(offlineQuotes).length;
      }
      
      const offlineDeletedQuotes = localStorage.getItem('offlineDeletedQuotes');
      if (offlineDeletedQuotes) {
        counts.offlineDeletedQuotes = JSON.parse(offlineDeletedQuotes).length;
      }
    } catch (error) {
      console.log('Could not get localStorage quote counts:', error.message);
    }
    
    return counts;
  } catch (error) {
    console.error('Error getting quote counts:', error);
    throw error;
  }
};

export default {
  fetchAllQuotes,
  fetchQuotesByCollection,
  searchQuotes,
  addQuote,
  deleteQuote,
  syncOfflineChanges,
  getQuoteCounts
};