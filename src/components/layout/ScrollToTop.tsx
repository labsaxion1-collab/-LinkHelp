import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const APP_MAIN_SCROLL_SELECTOR = '[data-testid="app-main-scroll"]';

/** Resets the real scrollport on internal route changes (app shell main, else window). */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    const main = document.querySelector(APP_MAIN_SCROLL_SELECTOR);
    if (main instanceof HTMLElement) {
      main.scrollTo(0, 0);
    }
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
