import axios from 'axios';

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

/**
 * Fetch all quotes from the API
 * @returns {Promise} Promise that resolves to the quotes data
 */
export const fetchAllQuotes = async () => {
  try {
    // Add retry logic for network errors
    let retries = 3;
    let lastError = null;
    
    while (retries > 0) {
      try {
        const response = await api.get('/api/quotes');
        console.log('Quotes fetched successfully:', response.data.length);
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
    
    // If we've exhausted all retries
    console.error('Error fetching quotes after multiple attempts:', lastError);
    throw lastError;
  } catch (error) {
    console.error('Error fetching quotes:', error);
    throw error;
  }
};


/**
 * Fetch quotes by collection
 * @param {string} collection - The collection name to filter by
 * @returns {Promise} Promise that resolves to the filtered quotes data
 */
export const fetchQuotesByCollection = async (collection) => {
  try {
    const response = await api.get(`/api/quotes?collection=${collection}`);
    return response.data;
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
    const response = await api.get(`/api/quotes?search=${encodeURIComponent(searchTerm)}`);
    return response.data;
  } catch (error) {
    console.error(`Error searching quotes with term "${searchTerm}":`, error);
    throw error;
  }
};

export default {
  fetchAllQuotes,
  fetchQuotesByCollection,
  searchQuotes
};