import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './lib/AuthContext.tsx';
import { LANG, DIR } from './lib/i18n';
import './index.css';

document.documentElement.lang = LANG;
document.documentElement.dir = DIR;

// Gracefully handle expected fetch aborts and iframe communication drops
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason?.message || String(reason || '');
    if (
      reason?.name === 'AbortError' ||
      msg.includes('aborted') ||
      msg.includes('The user aborted a request') ||
      msg.includes('chrome: call method') ||
      msg.includes('Cannot set property fetch')
    ) {
      // Prevent browser default logging of intentional aborts & iframe environment artifacts
      event.preventDefault();
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event?.message || String(event || '');
    if (
      msg.includes('Cannot set property fetch') ||
      msg.includes('chrome: call method') ||
      msg.includes('The user aborted a request')
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
