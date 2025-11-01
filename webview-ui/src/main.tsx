import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './AppIntegrated.css';
import './styles/App.css';
import './styles/RooCode.css';
import './styles/EnhancedTodo.css';
import './styles/CleanUI.css';
import { initHighlighter } from './utils/highlighter';

console.log('🚀🚀🚀 [Oropendola] WEBVIEW JS IS LOADING!');

// Initialize Shiki syntax highlighter before rendering
async function initApp() {
  console.log('[Oropendola] Initializing Shiki highlighter...');
  await initHighlighter();
  console.log('[Oropendola] Shiki highlighter initialized successfully');

  console.log('🚀 [Oropendola] About to render React app');
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('🚀 [Oropendola] React app rendered');
}

initApp();
