import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';
import { installViewportScale } from './lib/viewportScale';
// Self-hosted fonts, in the weights the reference screenshots render with:
// Barlow 400–700 for UI text, Barlow Condensed 600–800 for large numbers and
// the wordmark.
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow/700.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/barlow-condensed/800.css';
import './styles/staff.css';
import './styles/app.css';
import './styles/responsive.css';

// No <StrictMode>: screen logic consumes one-shot hand-offs from storage when
// it is created (see lib/dc.ts), and a dev double render would create and
// discard an instance that had already consumed them.
installViewportScale();

createRoot(document.getElementById('root') as HTMLElement).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
