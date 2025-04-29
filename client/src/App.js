import React, { useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Header from './components/Header';
import SearchContainer from './components/SearchContainer';
import QuoteList from './components/QuoteList';
import AddQuoteModal from './components/AddQuoteModal';
import LoginModal from './components/LoginModal';
import SuggestionModal from './components/SuggestionModal';
import ConnectionStatus from './components/ConnectionStatus';
import Toast from './components/Toast';
import { useAuth } from './context/AuthContext';
import { useQuote } from './context/QuoteContext';
import { startConnectionChecker } from './utils/connectionChecker';
import './App.css';

function App() {
  const { loadUser } = useAuth();
  const { fetchQuotes, initializeAdmin } = useQuote();

  useEffect(() => {
    // Initialize admin user if needed
    initializeAdmin();
    
    // Load user from token if exists
    loadUser();
    
    // Fetch quotes
    fetchQuotes();
    
    // Start connection checker to monitor network status
    const stopChecker = startConnectionChecker();
    
    // Clean up connection checker on unmount
    return () => {
      stopChecker();
    };
  }, []);

  return (
    <div className="App">
      <Header />
      <SearchContainer />
      <SuggestionModal />
      <div className="content">
        <div className="container">
          <QuoteList />
        </div>
      </div>
      <AddQuoteModal />
      <LoginModal />
      <Toast />
      <ConnectionStatus />
      <ToastContainer theme="dark" position="bottom-center" />
    </div>
  );
}

export default App;