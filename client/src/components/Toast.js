import React from 'react';
import { useQuote } from '../context/QuoteContext';

const Toast = () => {
  const { toastMessage } = useQuote();

  if (!toastMessage) return null;

  return (
    <div id="toast" className="toast" style={{ opacity: 1 }}>
      {toastMessage}
    </div>
  );
};

export default Toast;