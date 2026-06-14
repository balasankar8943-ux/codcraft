import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './components/AuthProvider';
import { loader } from '@monaco-editor/react';
import './styles.css';

// Configure Monaco Editor to load from local assets to support complete offline mode
loader.config({ paths: { vs: `${import.meta.env.BASE_URL}monaco/vs` } });

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
);
