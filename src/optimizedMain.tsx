import React from 'react';
import ReactDOM from 'react-dom/client';
import OptimizedApp from './OptimizedApp';
import { migrateOldData } from './services/migration';
import './styles/optimized.css';

async function bootstrap() {
  await migrateOldData();
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <OptimizedApp />
    </React.StrictMode>
  );
}

bootstrap();