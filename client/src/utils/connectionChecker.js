import { checkConnection, syncOfflineChanges, isOfflineMode } from './quoteService';
import { toast } from 'react-toastify';

let checkInterval = null;
let lastConnectionStatus = null;

/**
 * Start periodic connection checking
 * @param {Function} onStatusChange - Callback when connection status changes
 * @param {number} interval - Check interval in milliseconds (default: 30000)
 */
export const startConnectionChecker = (onStatusChange, interval = 30000) => {
  // Clear any existing interval
  if (checkInterval) {
    clearInterval(checkInterval);
  }

  // Initial check
  performConnectionCheck(onStatusChange);

  // Set up periodic checks
  checkInterval = setInterval(() => {
    performConnectionCheck(onStatusChange);
  }, interval);

  return () => {
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }
  };
};

/**
 * Stop connection checking
 */
export const stopConnectionChecker = () => {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
};

/**
 * Perform a connection check
 * @param {Function} onStatusChange - Callback when connection status changes
 */
const performConnectionCheck = async (onStatusChange) => {
  try {
    const isConnected = await checkConnection();
    const currentStatus = !isConnected;
    
    // If this is the first check or status has changed
    if (lastConnectionStatus === null || lastConnectionStatus !== currentStatus) {
      // Connection restored
      if (lastConnectionStatus === true && currentStatus === false) {
        toast.success('Connection restored!');
        // Trigger sync in the background
        syncOfflineChanges().then(result => {
          if (result.success) {
            toast.success('Offline changes synced successfully');
          }
        });
      }
      // Connection lost
      else if (lastConnectionStatus === false && currentStatus === true) {
        toast.info('Connection lost. Operating in offline mode.');
      }
      
      // Update last status
      lastConnectionStatus = currentStatus;
      
      // Call the callback if provided
      if (typeof onStatusChange === 'function') {
        onStatusChange(currentStatus);
      }
    }
  } catch (error) {
    console.error('Error checking connection:', error);
  }
};

/**
 * Get the current connection status
 * @returns {boolean} True if offline, false if online
 */
export const getConnectionStatus = () => {
  return isOfflineMode();
};

/**
 * Manually trigger a sync operation
 * @returns {Promise} Promise that resolves to the sync result
 */
export const triggerSync = async () => {
  if (isOfflineMode()) {
    toast.info('Cannot sync while offline. Please check your connection.');
    return { success: false, message: 'Offline mode active' };
  }
  
  try {
    const result = await syncOfflineChanges();
    return result;
  } catch (error) {
    console.error('Error triggering sync:', error);
    return { success: false, message: error.message };
  }
};