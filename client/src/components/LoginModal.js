import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import './styles/Modal.css';

const LoginModal = () => {
  const { isLoginModalOpen, toggleLoginModal, login, error, clearErrors } = useAuth();
  
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  useEffect(() => {
    // Pre-fill the username for convenience (since it's fixed)
    setFormData({
      ...formData,
      username: 'MohanaKrishnaDasa'
    });
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    login(formData.username, formData.password);
  };

  const handleClose = () => {
    clearErrors();
    toggleLoginModal();
  };

  if (!isLoginModalOpen) return null;

  return (
    <div className="modal">
      <div className="modal-content">
        <span className="close-modal" onClick={handleClose}>
          <FaTimes />
        </span>
        <h2>Login</h2>
        {error && <div className="error-message">{error}</div>}
        }
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input 
              type="text" 
              name="username" 
              id="username" 
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input 
              type="password" 
              name="password" 
              id="password" 
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn submit-btn">Login</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;