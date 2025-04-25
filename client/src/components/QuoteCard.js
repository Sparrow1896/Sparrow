import React, { useState, useEffect } from 'react';
import { FaCopy, FaTrash, FaUndo } from 'react-icons/fa';
import { useQuote } from '../context/QuoteContext';
import './styles/QuoteCard.css';
import axios from 'axios';
import { toast } from 'react-toastify';

const QuoteCard = ({ quote }) => {
  const { copyToClipboard, fetchQuotes } = useQuote();
  const [isAdmin, setIsAdmin] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Check if user is authenticated
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          // Use the API base URL from the quoteService configuration
          const baseURL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000';
          const res = await axios.get(`${baseURL}/api/auth`, {
            headers: {
              'x-auth-token': token
            }
          });
          console.log('Auth status check response:', res.data);
          // Any authenticated user can delete quotes
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch (err) {
        console.error('Error checking authentication status:', err);
        setIsAdmin(false);
      }
    };
    
    checkAuthStatus();
  }, []);
  
  // Debug quote object to help troubleshoot
  useEffect(() => {
    console.log('Quote object:', quote);
  }, [quote]);

  // Determine the appropriate class based on tags - FIXED to match quotecard tags with more flexibility
  const getCardClass = () => {
    // First check for specific quotecard tags with improved matching
    if (quote.tags && Array.isArray(quote.tags)) {
      // Check for Bhagavad-gītā As It Is tags
      if (quote.tags.some(tag => 
        tag.toLowerCase().includes("quotecard:bgatis") || 
        tag.toLowerCase().includes("quotecard:bgats") ||
        tag.toLowerCase().includes("quote-card:bgatis") ||
        tag.toLowerCase().includes("quote-card:bgats")
      )) {
        return "bgatis";
      } 
      // Check for Śrīmad-Bhāgavatam tags
      else if (quote.tags.some(tag => 
        tag.toLowerCase().includes("quotecard:sb") ||
        tag.toLowerCase().includes("quote-card:sb")
      )) {
        return "sb";
      } 
      // Check for Śrī Caitanya-caritāmṛta tags
      else if (quote.tags.some(tag => 
        tag.toLowerCase().includes("quotecard:cc") ||
        tag.toLowerCase().includes("quote-card:cc")
      )) {
        return "cc";
      } 
      // Check for The Empowered Ācārya tags
      else if (quote.tags.some(tag => 
        tag.toLowerCase().includes("quotecard:lila-amrita") ||
        tag.toLowerCase().includes("quote-card:lila-amrita")
      )) {
        return "lila-amrita";
      } 
      // Check for Superman tags
      else if (quote.tags.some(tag => 
        tag.toLowerCase().includes("quotecard:superman") ||
        tag.toLowerCase().includes("quote-card:superman") ||
        tag.toLowerCase().includes("superman")
      )) {
        return "superman";
      }
    }
    
    // If no specific quotecard tag is found, return empty string
    // This ensures only quotes with specific quotecard tags get colored
    return ""; // Default class (no special color)
  };
  
  // Delete quote function with enhanced error handling and ID format support
  const handleDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('You must be logged in to delete quotes');
        return;
      }
      
      // Import the deleteQuote function from quoteService
      const { deleteQuote } = await import('../utils/quoteService');
      
      // Enhanced ID detection - try multiple ID formats
      // First check for MongoDB ObjectId (_id)
      let quoteId = quote._id;
      
      // If not found, try other ID formats
      if (!quoteId) {
        // Try regular id property
        quoteId = quote.id;
        
        // If still not found, check if there's a statement ID we can use
        if (!quoteId && quote.statements && quote.statements.length > 0) {
          // Use the first statement's ID as a fallback
          quoteId = quote.statements[0].id;
        }
      }
      
      // Final validation
      if (!quoteId) {
        console.error('Quote ID not found in quote object:', quote);
        toast.error('Quote ID not found - cannot delete');
        return;
      }
      
      console.log(`Deleting quote with ID: ${quoteId}`);
      
      // Show loading indicator
      toast.info('Deleting quote...');
      
      try {
        const result = await deleteQuote(quoteId);
        console.log('Delete result:', result);
        
        // Hide the delete confirmation after successful deletion
        setShowDeleteConfirm(false);
        
        // Refresh quotes list
        fetchQuotes();
        toast.success('Quote deleted successfully');
      } catch (deleteErr) {
        console.error('Error deleting quote:', deleteErr);
        
        // Enhanced error handling
        if (deleteErr.message?.includes('not found')) {
          toast.error(`Quote not found. It may have been already deleted.`);
        } else if (deleteErr.message?.includes('Authentication') || 
                  deleteErr.message?.includes('token')) {
          // Don't show authentication errors twice (already handled in quoteService)
          // Just log them
          console.log('Authentication error during delete:', deleteErr.message);
        } else {
          toast.error(deleteErr.message || 'Error deleting quote');
        }
        
        setShowDeleteConfirm(false);
      }
    } catch (err) {
      console.error('Unexpected error in handleDelete:', err);
      toast.error('An unexpected error occurred');
      setShowDeleteConfirm(false);
    }
  };
  
  // Cancel delete confirmation
  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };
  
  // Undo delete function with improved offline support
  const handleUndo = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('You must be logged in to restore quotes');
        return;
      }
      
      // Show loading indicator
      toast.info('Attempting to restore quote...');
      
      // Try to use API directly for undo operation
      try {
        // Use the API base URL from the quoteService configuration
        const baseURL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000';
        await axios.post(`${baseURL}/api/quotes/undo`, {}, {
          headers: {
            'x-auth-token': token
          }
        });
        
        // Refresh quotes list
        fetchQuotes();
        toast.success('Quote restored successfully');
      } catch (error) {
        // If network error, try to restore from local storage
        if (error.code === 'ERR_NETWORK') {
          // Check if we have recently deleted quotes in localStorage
          const recentlyDeletedQuotes = JSON.parse(localStorage.getItem('recentlyDeletedQuotes') || '[]');
          
          if (recentlyDeletedQuotes.length > 0) {
            // Get the most recently deleted quote
            const quoteToRestore = recentlyDeletedQuotes[0];
            
            // Remove it from the recently deleted list
            const updatedDeletedQuotes = recentlyDeletedQuotes.slice(1);
            localStorage.setItem('recentlyDeletedQuotes', JSON.stringify(updatedDeletedQuotes));
            
            // Add it back to fallback data
            const fallbackData = JSON.parse(localStorage.getItem('fallbackQuotesData') || '[]');
            fallbackData.unshift(quoteToRestore);
            localStorage.setItem('fallbackQuotesData', JSON.stringify(fallbackData));
            
            // Refresh quotes list
            fetchQuotes();
            toast.success('Quote restored from local storage');
          } else {
            toast.error('No recently deleted quotes to restore');
          }
        } else {
          throw error;
        }
      }
    } catch (err) {
      console.error('Error restoring quote:', err);
      toast.error(err.message || 'Error restoring quote');
    }
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
      <div className="quote-actions">
        <button className="copy-btn" title="Copy quote" onClick={handleCopy}>
          <FaCopy />
        </button>
        
        {isAdmin && (
          <>
            {showDeleteConfirm ? (
              <div className="delete-confirm">
                <span>Delete?</span>
                <button onClick={handleDelete} className="confirm-yes">Yes</button>
                <button onClick={handleCancelDelete} className="confirm-no">No</button>
              </div>
            ) : (
              <button className="delete-btn" title="Delete quote" onClick={() => setShowDeleteConfirm(true)}>
                <FaTrash />
              </button>
            )}
            
            <button className="undo-btn" title="Undo last delete" onClick={handleUndo}>
              <FaUndo />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default QuoteCard;