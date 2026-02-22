import React from 'react';
import ReactDOM from 'react-dom/client';
import '../../../../ui/styles/ui.css';
import './app-layout.css';
import { App } from './App';

document.documentElement.setAttribute('data-theme', 'morethan.light');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
