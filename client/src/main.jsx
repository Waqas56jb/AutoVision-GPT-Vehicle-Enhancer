import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="bottom-center"
      toastOptions={{
        style: {
          background: '#0f172a',
          color: '#e2e8f0',
          border: '1px solid rgba(255,255,255,0.1)',
        },
      }}
    />
  </React.StrictMode>
);
