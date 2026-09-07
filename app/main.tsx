import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './page';
import './globals.css';
createRoot(document.getElementById('root')!).render(<App />);
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch(() => console.info('Modo offline indisponível neste navegador.'));
  });
}
