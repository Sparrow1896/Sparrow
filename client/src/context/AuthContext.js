import React, { createContext, useReducer, useContext } from 'react';
import axios from 'axios';

// Create context
const AuthContext = createContext();

// Initial state
const initialState = {
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  user: null,
  loading: false,
  error: null,
  isLoginModalOpen: false
};

// Reducer
function authReducer(state, action) {
  switch (action.type) {
    case 'USER_LOADING':
      return {
        ...state,
        loading: true
      };
    case 'USER_LOADED':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload,
        loading: false
      };
    case 'LOGIN_SUCCESS':
      localStorage.setItem('token', action.payload.token);
      return {
        ...state,
        ...action.payload,
        isAuthenticated: true,
        loading: false,
        error: null,
        isLoginModalOpen: false
      };
    case 'AUTH_ERROR':
    case 'LOGIN_FAIL':
    case 'LOGOUT_SUCCESS':
      localStorage.removeItem('token');
      return {
        ...state,
        token: null,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload
      };
    case 'CLEAR_ERRORS':
      return {
        ...state,
        error: null
      };
    case 'TOGGLE_LOGIN_MODAL':
      return {
        ...state,
        isLoginModalOpen: !state.isLoginModalOpen,
        error: null
      };
    default:
      return state;
  }
}

// Provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load user
  const loadUser = async () => {
    if (localStorage.token) {
      // Set auth token
      setAuthToken(localStorage.token);
      
      try {
        // Get token from localStorage
        const token = localStorage.getItem('token');
        
        // Parse the token to get user info
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        
        const user = JSON.parse(jsonPayload);
        
        dispatch({
          type: 'USER_LOADED',
          payload: user
        });
      } catch (err) {
        dispatch({ type: 'AUTH_ERROR' });
      }
    }
  };

  // Login user
  const login = async (formData) => {
    const config = {
      headers: {
        'Content-Type': 'application/json'
      }
    };

    try {
      dispatch({ type: 'USER_LOADING' });
      const res = await axios.post('/api/auth', formData, config);
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: res.data
      });
      
      loadUser();
    } catch (err) {
      console.error('Login error:', err.response ? err.response.data : err.message);
      
      dispatch({
        type: 'LOGIN_FAIL',
        payload: err.response ? err.response.data.msg : 'Server error'
      });
      
      // Clear error after 5 seconds
      setTimeout(() => dispatch({ type: 'CLEAR_ERRORS' }), 5000);
    }
  };

  // Logout
  const logout = () => {
    dispatch({ type: 'LOGOUT_SUCCESS' });
  };

  // Clear errors
  const clearErrors = () => {
    dispatch({ type: 'CLEAR_ERRORS' });
  };

  // Toggle login modal
  const toggleLoginModal = () => {
    dispatch({ type: 'TOGGLE_LOGIN_MODAL' });
  };

  // Set Auth token
  const setAuthToken = token => {
    if (token) {
      axios.defaults.headers.common['x-auth-token'] = token;
    } else {
      delete axios.defaults.headers.common['x-auth-token'];
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        loading: state.loading,
        error: state.error,
        isLoginModalOpen: state.isLoginModalOpen,
        loadUser,
        login,
        logout,
        clearErrors,
        toggleLoginModal
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Create hook
export const useAuth = () => {
  return useContext(AuthContext);
};