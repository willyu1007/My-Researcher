import React from 'react';
import ReactDOM from 'react-dom/client';
import '../../../../ui/styles/ui.css';
import './app-layout.css';
import { App } from './App';
import { applyTheme, readStoredThemeMode, readSystemPrefersDark, resolveTheme } from './theme';

const initialThemeMode = readStoredThemeMode();
applyTheme(resolveTheme(initialThemeMode, readSystemPrefersDark()));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App initialThemeMode={initialThemeMode} />
  </React.StrictMode>,
);
