/** Marker for the only scroll region inside a public profile sheet. */
export const PUBLIC_PROFILE_SCROLL_ATTR = 'data-public-profile-scroll';

function isInsidePublicProfileScroll(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(`[${PUBLIC_PROFILE_SCROLL_ATTR}]`));
}

/**
 * Locks document scroll (incl. iOS rubber-band) while a full-screen sheet is open.
 * Touch scrolling is allowed only inside `[data-public-profile-scroll]` regions.
 */
export function lockBodyScroll(): () => void {
  const scrollY = window.scrollY;
  const body = document.body;
  const html = document.documentElement;
  const root = document.getElementById('root');

  const prev = {
    bodyOverflow: body.style.overflow,
    bodyPosition: body.style.position,
    bodyTop: body.style.top,
    bodyLeft: body.style.left,
    bodyRight: body.style.right,
    bodyWidth: body.style.width,
    bodyOverscroll: body.style.overscrollBehavior,
    bodyTouchAction: body.style.touchAction,
    htmlOverflow: html.style.overflow,
    htmlOverscroll: html.style.overscrollBehavior,
    rootOverflow: root?.style.overflow ?? '',
    bodyProfileOpen: body.getAttribute('data-public-profile-open'),
  };

  body.style.overflow = 'hidden';
  html.style.overflow = 'hidden';
  body.style.overscrollBehavior = 'none';
  html.style.overscrollBehavior = 'none';
  body.style.touchAction = 'none';
  body.setAttribute('data-public-profile-open', 'true');
  if (root) root.style.overflow = 'hidden';

  body.style.position = 'fixed';
  body.style.top = `-${scrollY}px`;
  body.style.left = '0';
  body.style.right = '0';
  body.style.width = '100%';

  const onTouchMove = (event: TouchEvent) => {
    if (isInsidePublicProfileScroll(event.target)) return;
    event.preventDefault();
  };

  document.addEventListener('touchmove', onTouchMove, { passive: false });

  return () => {
    document.removeEventListener('touchmove', onTouchMove);

    body.style.overflow = prev.bodyOverflow;
    body.style.position = prev.bodyPosition;
    body.style.top = prev.bodyTop;
    body.style.left = prev.bodyLeft;
    body.style.right = prev.bodyRight;
    body.style.width = prev.bodyWidth;
    body.style.overscrollBehavior = prev.bodyOverscroll;
    body.style.touchAction = prev.bodyTouchAction;
    html.style.overflow = prev.htmlOverflow;
    html.style.overscrollBehavior = prev.htmlOverscroll;
    if (root) root.style.overflow = prev.rootOverflow;

    if (prev.bodyProfileOpen == null) {
      body.removeAttribute('data-public-profile-open');
    } else {
      body.setAttribute('data-public-profile-open', prev.bodyProfileOpen);
    }

    window.scrollTo(0, scrollY);
  };
}
