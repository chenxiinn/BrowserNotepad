import React from 'react';
import ReactDOM from 'react-dom/client';
import OptimizedApp from './OptimizedApp';
import './styles/optimized.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <OptimizedApp />
  </React.StrictMode>
);
