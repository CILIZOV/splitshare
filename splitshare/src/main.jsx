import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/splitshare/sw.js')
      .then(() => console.log('SW registered'))
      .catch(err => console.log('SW failed:', err));
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)