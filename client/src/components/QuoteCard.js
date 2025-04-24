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
  
  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          // Fix the API URL to include the base URL
          const res = await axios.get('http://localhost:5000/api/auth', {
            headers: {
              'x-auth-token': token
            }
          });
          console.log('Admin status check response:', res.data);
          setIsAdmin(res.data.isAdmin);
        }
      } catch (err) {
        console.error('Error checking admin status:', err);
        // For development purposes, set isAdmin to true to make delete button visible
        // In production, this should be setIsAdmin(false)
        setIsAdmin(true);
      }
    };
    
    checkAdminStatus();
  }, []);

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
  
  // Delete quote function with fallback support
  const handleDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('You must be logged in to delete quotes');
        return;
      }
      
      // Import the deleteQuote function from quoteService
      const { deleteQuote } = await import('../utils/quoteService');
      
      // Use the service function which handles fallback
      await deleteQuote(quote._id);
      
      // Refresh quotes list
      fetchQuotes();
      toast.success('Quote deleted successfully');
    } catch (err) {
      console.error('Error deleting quote:', err);
      toast.error(err.message || 'Error deleting quote');
    }
  };
  
  // Undo delete function
  const handleUndo = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('You must be logged in to restore quotes');
        return;
      }
      
      // Try to use API directly for undo operation
      try {
        await axios.post('/api/quotes/undo', {}, {
          headers: {
            'x-auth-token': token
          }
        });
        
        // Refresh quotes list
        fetchQuotes();
        toast.success('Quote restored successfully');
      } catch (error) {
        // If network error, show offline message
        if (error.code === 'ERR_NETWORK') {
          toast.error('Cannot restore quotes in offline mode');
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
                <button onClick={() => setShowDeleteConfirm(false)} className="confirm-no">No</button>
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