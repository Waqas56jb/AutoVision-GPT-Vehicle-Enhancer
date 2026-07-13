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
          background: 'rgba(255,255,255,0.92)',
          color: '#1e293b',
          border: '1px solid #dbeafe',
          borderRadius: '14px',
          boxShadow: '0 20px 45px -25px rgba(30,58,138,0.45)',
          backdropFilter: 'blur(12px)',
          fontWeight: 500,
          fontSize: '14px',
        },
        success: { iconTheme: { primary: '#2563eb', secondary: '#fff' } },
        loading: { iconTheme: { primary: '#3b82f6', secondary: '#dbeafe' } },
      }}
    />
  </React.StrictMode>
);
