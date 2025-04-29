import axios from 'axios';
import { toast } from 'react-toastify';

// Configure axios with base URL and timeout settings
const api = axios.create({
  baseURL: process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000',
  timeout: 15000, // 15 second timeout for slower connections
  headers: {
    'Content-Type': 'application/json'
  },
  // Add retry logic for failed requests
  retry: 2,
  retryDelay: 1000
});

// Add retry functionality to axios
api.interceptors.response.use(null, async (error) => {
  const config = error.config;

  // If we don't have a retry property or we've reached max retries, reject
  if (!config || !config.retry || config.retryCount >= config.retry) {
    return Promise.reject(error);
  }

  // Initialize retry count if not set
  config.retryCount = config.retryCount || 0;
  config.retryCount++;

  // Create a new promise to handle retry delay
  const delayRetry = new Promise(resolve => {
    setTimeout(() => {
      console.log(`Retrying request (${config.retryCount}/${config.retry}): ${config.url}`);
      resolve();
    }, config.retryDelay || 1000);
  });

  // Wait for the delay, then retry the request
  await delayRetry;
  return api(config);
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
const fetchAllQuotes = async () => {
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
          console.log('Found offline changes, will sync later...');
          // We'll sync in a separate call to avoid circular dependencies
          setTimeout(() => syncOfflineChanges(), 100);
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
const fetchQuotesByCollection = async (collection) => {
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
const searchQuotes = async (searchTerm) => {
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
const addQuote = async (quoteData) => {
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
const deleteQuote = async (quoteId) => {
  // Declare quoteToDelete at the top level of the function so it's accessible in all blocks
  let quoteToDelete = null;
  
  try {
    // Check for authentication
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Authentication required to delete quotes');
      throw new Error('Authentication required');
    }

    // Validate quote ID
    if (!quoteId) {
      toast.error('Invalid quote ID');
      throw new Error('Invalid quote ID');
    }

    console.log(`Attempting to delete quote with ID: ${quoteId}`);

    // Store the quote before deletion for potential recovery
    if (fallbackQuotesData) {
      // Improved matching to handle different ID formats
      quoteToDelete = fallbackQuotesData.find(quote => {
        // Check main IDs
        if (quote._id === quoteId || quote.id === quoteId) return true;

        // Check statement IDs if available
        if (quote.statements && Array.isArray(quote.statements)) {
          return quote.statements.some(stmt => stmt.id === quoteId || stmt._id === quoteId);
        }

        return false;
      });
    }

    // If we're already in fallback mode or can't reach the server, go straight to offline deletion
    if (usingFallbackData) {
      return handleOfflineDeletion(quoteId, quoteToDelete);
    }

    // Try API first
    try {
      // First check if we can reach the server
      try {
        await api.get('/api/health');
      } catch (healthError) {
        console.log('Server unreachable, switching to offline mode');
        return handleOfflineDeletion(quoteId, quoteToDelete);
      }

      // Attempt to delete the quote regardless of ID format
      // The server will handle validation and searching by different identifiers
      const response = await api.delete(`/api/quotes/${quoteId}`, {
        headers: {
          'x-auth-token': token
        }
      });

      console.log('Quote deleted successfully:', response.data);

      // Get the actual MongoDB ID from the response
      const actualId = response.data.id || quoteId;

      // Also remove from local fallback data if it exists
      if (fallbackQuotesData) {
        fallbackQuotesData = fallbackQuotesData.filter(quote => {
          // Remove by any matching ID
          if (quote._id === actualId || quote._id === quoteId ||
            quote.id === actualId || quote.id === quoteId) {
            return false;
          }

          // Also check statement IDs
          if (quote.statements && Array.isArray(quote.statements)) {
            return !quote.statements.some(stmt => stmt.id === quoteId || stmt._id === quoteId);
          }

          return true;
        });

        // Update the local storage with the updated data
        localStorage.setItem('fallbackQuotesData', JSON.stringify(fallbackQuotesData));
      }

      // Store the deleted quote for potential undo
      if (quoteToDelete) {
        let recentlyDeletedQuotes = JSON.parse(localStorage.getItem('recentlyDeletedQuotes') || '[]');
        recentlyDeletedQuotes.unshift({
          ...quoteToDelete,
          deletedAt: new Date().toISOString(),
          deletedId: actualId // Store the ID used for deletion
        });
        // Keep only the 10 most recent deleted quotes
        recentlyDeletedQuotes = recentlyDeletedQuotes.slice(0, 10);
        localStorage.setItem('recentlyDeletedQuotes', JSON.stringify(recentlyDeletedQuotes));
      }

      toast.success('Quote deleted successfully');
      return response.data;
    } catch (apiError) {
      // Enhanced error handling
      console.error('Error deleting quote:', apiError);

      // Handle specific API errors
      if (apiError.response) {
        if (apiError.response.status === 404) {
          console.error(`API Error: ${apiError.response.status} DELETE /api/quotes/${quoteId}`);
          
          // If the quote is not found on the server but exists locally, delete it locally
          if (quoteToDelete) {
            toast.info('Quote not found on server but exists locally. Deleting from local storage.');
            return handleOfflineDeletion(quoteId, quoteToDelete);
          }
          
          throw new Error(`Quote not found with ID: ${quoteId}`);
        } else if (apiError.response.status === 401) {
          toast.error('Your session has expired. Please log in again.');
          localStorage.removeItem('token'); // Clear invalid token
          throw new Error('Authentication required');
        } else if (apiError.response.data && apiError.response.data.msg) {
          // Use the server's error message if available
          throw new Error(apiError.response.data.msg);
        }
      } else if (apiError.code === 'ERR_NETWORK') {
        // Handle offline mode
        toast.info('Network unavailable. Operating in offline mode.');
        return handleOfflineDeletion(quoteId, quoteToDelete);
      }

      throw apiError;
    }
  } catch (error) {
    // Handle authentication errors
    if (error.response && error.response.status === 401) {
      toast.error('Your session has expired. Please log in again.');
      // Clear the invalid token
      localStorage.removeItem('token');
      throw new Error('Authentication expired');
    }

    // If API fails due to network error, use fallback
    if (error.code === 'ERR_NETWORK') {
      console.log('Network error, using fallback for deleting quote');
      // Find the quote in fallback data if not already found
      if (!quoteToDelete && fallbackQuotesData) {
        quoteToDelete = fallbackQuotesData.find(quote => {
          // Check main IDs
          if (quote._id === quoteId || quote.id === quoteId) return true;

          // Check statement IDs if available
          if (quote.statements && Array.isArray(quote.statements)) {
            return quote.statements.some(stmt => stmt.id === quoteId || stmt._id === quoteId);
          }

          return false;
        });
      }
      return handleOfflineDeletion(quoteId, quoteToDelete);
    }
    
    console.error('Error deleting quote ' + quoteId + ':', error);
    throw error;
  }
};

/**
 * Handle offline deletion of a quote
 * @param {string} quoteId - The ID of the quote to delete
 * @param {Object} quoteToDelete - The quote object to delete (if found)
 * @returns {Promise} Promise that resolves when the quote is deleted locally
 */
const handleOfflineDeletion = (quoteId, quoteToDelete) => {
  usingFallbackData = true;
  toast.info('Using offline mode: deletion tracked locally');

  // If we don't have the quote data but have the ID, try to find it in fallback data
  if (!quoteToDelete && fallbackQuotesData) {
    quoteToDelete = fallbackQuotesData.find(quote => {
      // Check main IDs
      if (quote._id === quoteId || quote.id === quoteId) return true;

      // Check statement IDs if available
      if (quote.statements && Array.isArray(quote.statements)) {
        return quote.statements.some(stmt => stmt.id === quoteId || stmt._id === quoteId);
      }

      return false;
    });
  }

  // Get existing deleted quotes from localStorage or initialize empty array
  let deletedQuotes = JSON.parse(localStorage.getItem('offlineDeletedQuotes') || '[]');

  // Add quote ID to deleted list with more metadata
  deletedQuotes.push({
    id: quoteId,
    deletedAt: new Date().toISOString(),
    quoteData: quoteToDelete // Store the full quote data for better recovery
  });

  localStorage.setItem('offlineDeletedQuotes', JSON.stringify(deletedQuotes));

  // Also remove from local fallback data if it exists
  if (fallbackQuotesData) {
    const originalLength = fallbackQuotesData.length;
    fallbackQuotesData = fallbackQuotesData.filter(quote => {
      // Remove by any matching ID
      if (quote._id === quoteId || quote.id === quoteId) {
        return false;
      }

      // Also check statement IDs
      if (quote.statements && Array.isArray(quote.statements)) {
        return !quote.statements.some(stmt => stmt.id === quoteId || stmt._id === quoteId);
      }

      return true;
    });

    // Update the local storage with the updated data
    localStorage.setItem('fallbackQuotesData', JSON.stringify(fallbackQuotesData));
    
    // Check if we actually removed anything
    if (originalLength > fallbackQuotesData.length) {
      console.log(`Removed quote with ID ${quoteId} from local storage`);
    } else {
      console.log(`No quote with ID ${quoteId} found in local storage`);
    }
  }

  // Store the deleted quote for potential undo
  if (quoteToDelete) {
    let recentlyDeletedQuotes = JSON.parse(localStorage.getItem('recentlyDeletedQuotes') || '[]');
    recentlyDeletedQuotes.unshift({
      ...quoteToDelete,
      deletedAt: new Date().toISOString(),
      offlineDeleted: true
    });
    // Keep only the 10 most recent deleted quotes
    recentlyDeletedQuotes = recentlyDeletedQuotes.slice(0, 10);
    localStorage.setItem('recentlyDeletedQuotes', JSON.stringify(recentlyDeletedQuotes));
  }

  toast.success('Quote marked for deletion. Will sync when connection is restored.');
  return { success: true, message: 'Quote marked for deletion locally', id: quoteId };
};

/**
 * Sync offline changes when connection is restored
 * @returns {Promise} Promise that resolves when sync is complete
 */

/**
 * Sync offline changes when connection is restored
 * @returns {Promise} Promise that resolves when sync is complete
 */
const syncOfflineChanges = async () => {
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
      for (const deletedItem of deletedQuotes) {
        try {
          // Handle both old and new format of deleted quotes
          const quoteId = deletedItem.id || deletedItem.quoteId;
          
          if (!quoteId) {
            console.error('Invalid deleted quote entry:', deletedItem);
            continue;
          }
          
          await api.delete(`/api/quotes/${quoteId}`, {
            headers: { 'x-auth-token': token }
          });
          console.log(`Synced deletion of quote ID: ${quoteId}`);
        } catch (error) {
          // If 404, consider it already deleted and continue
          if (error.response && error.response.status === 404) {
            console.log(`Quote already deleted or not found on server`);
          } else {
            console.error(`Error syncing deleted quote:`, error);
          }
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
const getQuoteCounts = async () => {
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

/**
 * Update an existing quote
 * @param {string} quoteId - The ID of the quote to update
 * @param {Object} quoteData - The updated quote data
 * @returns {Promise} Promise that resolves to the updated quote
 */
const updateQuote = async (quoteId, quoteData) => {
  try {
    // Check for authentication
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Authentication required to update quotes');
      throw new Error('Authentication required');
    }

    // Validate quote ID
    if (!quoteId) {
      toast.error('Invalid quote ID');
      throw new Error('Invalid quote ID');
    }

    console.log(`Attempting to update quote with ID: ${quoteId}`);

    // If we're already in fallback mode or can't reach the server, go straight to offline update
    if (usingFallbackData) {
      return handleOfflineUpdate(quoteId, quoteData);
    }

    // Try API first
    try {
      // First check if we can reach the server
      try {
        await api.get('/api/health');
      } catch (healthError) {
        console.log('Server unreachable, switching to offline mode');
        return handleOfflineUpdate(quoteId, quoteData);
      }

      // Attempt to update the quote
      const response = await api.put(`/api/quotes/${quoteId}`, quoteData, {
        headers: {
          'x-auth-token': token
        }
      });

      console.log('Quote updated successfully:', response.data);

      // Also update in local fallback data if it exists
      if (fallbackQuotesData) {
        fallbackQuotesData = fallbackQuotesData.map(quote => {
          if (quote._id === quoteId || quote.id === quoteId) {
            return { ...quote, ...quoteData };
          }
          return quote;
        });

        // Update the local storage with the updated data
        localStorage.setItem('fallbackQuotesData', JSON.stringify(fallbackQuotesData));
      }

      toast.success('Quote updated successfully');
      return response.data;
    } catch (apiError) {
      // Enhanced error handling
      console.error('Error updating quote:', apiError);

      // Handle specific API errors
      if (apiError.response) {
        if (apiError.response.status === 404) {
          throw new Error(`Quote not found with ID: ${quoteId}`);
        } else if (apiError.response.status === 401) {
          toast.error('Your session has expired. Please log in again.');
          localStorage.removeItem('token'); // Clear invalid token
          throw new Error('Authentication required');
        } else if (apiError.response.data && apiError.response.data.msg) {
          // Use the server's error message if available
          throw new Error(apiError.response.data.msg);
        }
      } else if (apiError.code === 'ERR_NETWORK') {
        // Handle offline mode
        toast.info('Network unavailable. Operating in offline mode.');
        return handleOfflineUpdate(quoteId, quoteData);
      }

      throw apiError;
    }
  } catch (error) {
    // Handle authentication errors
    if (error.response && error.response.status === 401) {
      toast.error('Your session has expired. Please log in again.');
      // Clear the invalid token
      localStorage.removeItem('token');
      throw new Error('Authentication expired');
    }

    // If API fails due to network error, use fallback
    if (error.code === 'ERR_NETWORK') {
      console.log('Network error, using fallback for updating quote');
      return handleOfflineUpdate(quoteId, quoteData);
    }
    
    console.error('Error updating quote ' + quoteId + ':', error);
    throw error;
  }
};

/**
 * Handle offline update of a quote
 * @param {string} quoteId - The ID of the quote to update
 * @param {Object} quoteData - The updated quote data
 * @returns {Promise} Promise that resolves when the quote is updated locally
 */
const handleOfflineUpdate = (quoteId, quoteData) => {
  usingFallbackData = true;
  toast.info('Using offline mode: update tracked locally');

  // Find the quote in fallback data
  let quoteFound = false;
  if (fallbackQuotesData) {
    fallbackQuotesData = fallbackQuotesData.map(quote => {
      if (quote._id === quoteId || quote.id === quoteId) {
        quoteFound = true;
        return { ...quote, ...quoteData, updatedAt: new Date().toISOString() };
      }
      return quote;
    });

    // Update the local storage with the updated data
    localStorage.setItem('fallbackQuotesData', JSON.stringify(fallbackQuotesData));
  }

  // If quote wasn't found in fallback data, it might be a new offline quote
  if (!quoteFound) {
    // Check in offline quotes
    let offlineQuotes = JSON.parse(localStorage.getItem('offlineQuotes') || '[]');
    let offlineQuoteFound = false;

    offlineQuotes = offlineQuotes.map(quote => {
      if (quote._id === quoteId || quote.id === quoteId) {
        offlineQuoteFound = true;
        return { ...quote, ...quoteData, updatedAt: new Date().toISOString() };
      }
      return quote;
    });

    if (offlineQuoteFound) {
      localStorage.setItem('offlineQuotes', JSON.stringify(offlineQuotes));
    }
  }

  // Track the update for later sync
  let offlineUpdates = JSON.parse(localStorage.getItem('offlineUpdatedQuotes') || '[]');
  
  // Check if this quote is already in the updates list
  const existingUpdateIndex = offlineUpdates.findIndex(update => 
    update.id === quoteId || update.quoteId === quoteId
  );

  if (existingUpdateIndex >= 0) {
    // Update the existing entry
    offlineUpdates[existingUpdateIndex] = {
      id: quoteId,
      updatedAt: new Date().toISOString(),
      quoteData: quoteData
    };
  } else {
    // Add a new entry
    offlineUpdates.push({
      id: quoteId,
      updatedAt: new Date().toISOString(),
      quoteData: quoteData
    });
  }

  localStorage.setItem('offlineUpdatedQuotes', JSON.stringify(offlineUpdates));

  toast.success('Quote updated locally. Will sync when connection is restored.');
  return { 
    success: true, 
    message: 'Quote updated locally', 
    id: quoteId,
    ...quoteData,
    updatedAt: new Date().toISOString(),
    offlineUpdated: true
  };
};

/**
 * Check if the app is currently in offline mode
 * @returns {boolean} True if the app is in offline mode
 */
const isOfflineMode = () => {
  return usingFallbackData;
};

/**
 * Check connection to the server
 * @returns {Promise<boolean>} Promise that resolves to true if connected, false otherwise
 */
const checkConnection = async () => {
  try {
    await api.get('/api/health');
    if (usingFallbackData) {
      // We were offline but now we're back online
      usingFallbackData = false;
      toast.success('Connection restored. Syncing changes...');
      // Trigger sync in the background
      setTimeout(() => syncOfflineChangesEnhanced(), 100);
    }
    return true;
  } catch (error) {
    if (!usingFallbackData) {
      // We just went offline
      usingFallbackData = true;
      toast.info('Connection lost. Operating in offline mode.');
    }
    return false;
  }
};

// Enhanced sync function to include updates
const syncOfflineChangesEnhanced = async () => {
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

    // Sync updated quotes
    const updatedQuotes = JSON.parse(localStorage.getItem('offlineUpdatedQuotes') || '[]');
    if (updatedQuotes.length > 0) {
      console.log(`Syncing ${updatedQuotes.length} updated quotes to server...`);
      for (const updateItem of updatedQuotes) {
        try {
          const quoteId = updateItem.id || updateItem.quoteId;
          
          if (!quoteId) {
            console.error('Invalid updated quote entry:', updateItem);
            continue;
          }
          
          await api.put(`/api/quotes/${quoteId}`, updateItem.quoteData, {
            headers: { 'x-auth-token': token }
          });
          console.log(`Synced update of quote ID: ${quoteId}`);
        } catch (error) {
          if (error.response && error.response.status === 404) {
            console.log(`Quote not found on server for update`);
          } else {
            console.error(`Error syncing updated quote:`, error);
          }
        }
      }

      // Clear synced updates
      localStorage.removeItem('offlineUpdatedQuotes');
    }

    // Sync deleted quotes
    const deletedQuotes = JSON.parse(localStorage.getItem('offlineDeletedQuotes') || '[]');
    if (deletedQuotes.length > 0) {
      console.log(`Syncing ${deletedQuotes.length} deleted quotes to server...`);
      for (const deletedItem of deletedQuotes) {
        try {
          // Handle both old and new format of deleted quotes
          const quoteId = deletedItem.id || deletedItem.quoteId;
          
          if (!quoteId) {
            console.error('Invalid deleted quote entry:', deletedItem);
            continue;
          }
          
          await api.delete(`/api/quotes/${quoteId}`, {
            headers: { 'x-auth-token': token }
          });
          console.log(`Synced deletion of quote ID: ${quoteId}`);
        } catch (error) {
          // If 404, consider it already deleted and continue
          if (error.response && error.response.status === 404) {
            console.log(`Quote already deleted or not found on server`);
          } else {
            console.error(`Error syncing deleted quote:`, error);
          }
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

// Export as named exports to avoid circular dependency issues
export {
  fetchAllQuotes,
  fetchQuotesByCollection,
  searchQuotes,
  addQuote,
  updateQuote,
  deleteQuote,
  syncOfflineChanges,
  syncOfflineChangesEnhanced,
  getQuoteCounts,
  isOfflineMode,
  checkConnection
};