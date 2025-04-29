import React, { useState, useEffect } from 'react';
import { isOfflineMode, checkConnection, syncOfflineChanges } from '../utils/quoteService';
import { toast } from 'react-toastify';
import './styles/ConnectionStatus.css';

/**
 * Component to display the current connection status and provide sync controls
 */
const ConnectionStatus = () => {
  const [isOffline, setIsOffline] = useState(isOfflineMode());
  const [isSyncing, setIsSyncing] = useState(false);
  const [offlineStats, setOfflineStats] = useState({
    offlineQuotes: 0,
    offlineUpdates: 0,
    offlineDeletes: 0
  });

  // Check connection status periodically
  useEffect(() => {
    // Initial check
    updateConnectionStatus();
    updateOfflineStats();

    // Set up periodic checks
    const connectionInterval = setInterval(() => {
      updateConnectionStatus();
    }, 30000); // Check every 30 seconds

    // Set up periodic offline stats updates
    const statsInterval = setInterval(() => {
      updateOfflineStats();
    }, 5000); // Update stats every 5 seconds

    return () => {
      clearInterval(connectionInterval);
      clearInterval(statsInterval);
    };
  }, []);

  // Update the connection status
  const updateConnectionStatus = async () => {
    const isConnected = await checkConnection();
    setIsOffline(!isConnected);
  };

  // Update offline statistics
  const updateOfflineStats = () => {
    try {
      // Get counts from localStorage
      const offlineQuotes = JSON.parse(localStorage.getItem('offlineQuotes') || '[]').length;
      const offlineUpdates = JSON.parse(localStorage.getItem('offlineUpdatedQuotes') || '[]').length;
      const offlineDeletes = JSON.parse(localStorage.getItem('offlineDeletedQuotes') || '[]').length;

      setOfflineStats({
        offlineQuotes,
        offlineUpdates,
        offlineDeletes
      });
    } catch (error) {
      console.error('Error updating offline stats:', error);
    }
  };

  // Manually trigger sync
  const handleSync = async () => {
    if (isOffline) {
      toast.info('Cannot sync while offline. Please check your connection.');
      return;
    }

    setIsSyncing(true);
    try {
      const result = await syncOfflineChanges();
      if (result.success) {
        toast.success('Sync completed successfully');
        updateOfflineStats(); // Update stats after sync
      } else {
        toast.error(`Sync failed: ${result.message}`);
      }
    } catch (error) {
      toast.error(`Sync error: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // If there are no offline changes, don't show the component
  const totalOfflineChanges = offlineStats.offlineQuotes + offlineStats.offlineUpdates + offlineStats.offlineDeletes;
  if (!isOffline && totalOfflineChanges === 0) {
    return null;
  }

  return (
    <div className="connection-status">
      <div className={`status-indicator ${isOffline ? 'offline' : 'online'}`}></div>
      <div className="status-text">
        {isOffline ? 'Offline Mode' : 'Online'}
        {totalOfflineChanges > 0 && (
          <span className="status-badge">
            {totalOfflineChanges}
          </span>
        )}
      </div>
      
      {totalOfflineChanges > 0 && (
        <div className="status-details">
          {offlineStats.offlineQuotes > 0 && (
            <div>New quotes: {offlineStats.offlineQuotes}</div>
          )}
          {offlineStats.offlineUpdates > 0 && (
            <div>Updated quotes: {offlineStats.offlineUpdates}</div>
          )}
          {offlineStats.offlineDeletes > 0 && (
            <div>Deleted quotes: {offlineStats.offlineDeletes}</div>
          )}
        </div>
      )}
      
      {!isOffline && totalOfflineChanges > 0 && (
        <button 
          onClick={handleSync} 
          disabled={isSyncing}
          className="sync-button"
        >
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </button>
      )}
    </div>
  );
};



export default ConnectionStatus;