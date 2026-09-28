// CSS order matters (later files win specificity ties), and it follows import order:
//   1. tokens.css + base.css  — imported first, below
//   2. component CSS, then each page's CSS — imported by the modules under App
//      (a page imports its components before its own ./Page.css)
//   3. responsive.css         — imported last: its min-width overrides must beat the page
//      classes, the way its !important rules used to beat the static site's inline styles.
import './styles/tokens.css';
import './styles/base.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';
import './styles/responsive.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
