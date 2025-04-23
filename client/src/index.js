import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { QuoteProvider } from './context/QuoteContext';
import axios from 'axios';

// Set default base URL for all axios requests
axios.defaults.baseURL = 'http://localhost:5000';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <QuoteProvider>
        <App />
      </QuoteProvider>
    </AuthProvider>
  </React.StrictMode>
);