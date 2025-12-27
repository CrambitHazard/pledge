import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Show loading indicator immediately
rootElement.innerHTML = '<div style="padding: 20px; text-align: center;"><p>Loading...</p></div>';

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error('Error rendering app:', error);
  rootElement.innerHTML = `
    <div style="padding: 20px; color: red; font-family: sans-serif;">
      <h1>Error loading app</h1>
      <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px;">${error instanceof Error ? error.message : String(error)}</pre>
      <p>Check the browser console (F12) for more details.</p>
    </div>
  `;
}