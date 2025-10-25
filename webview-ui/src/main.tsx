import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/App.css';
import './styles/EnhancedTodo.css';
import './styles/CleanUI.css';
import { initHighlighter } from './utils/highlighter';

// Initialize Shiki syntax highlighter before rendering
async function initApp() {
  console.log('[Oropendola] Initializing Shiki highlighter...');
  await initHighlighter();
  console.log('[Oropendola] Shiki highlighter initialized successfully');

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

initApp();
