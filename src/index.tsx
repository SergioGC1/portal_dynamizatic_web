import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
// PrimeReact global styles
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';
// PrimeReact theme (keeps components styled). If you later replace with a custom PrimeReact theme,
// you can update or remove this import.
import 'primereact/resources/themes/saga-blue/theme.css';
// PrimeReact base css should be loaded before project overrides so we can style components
import 'primereact/resources/primereact.css';
// Use local project styles (layout aggregates theme and partials). Ensure `sass` is installed.
import './styles/layout.scss';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { AuthProvider } from './contexts/AuthContext';

console.log('index.tsx: iniciando aplicación (dev)');

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
