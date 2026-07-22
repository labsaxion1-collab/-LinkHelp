import { useEffect, type RefObject } from 'react';

/**
 * Fade-in curto por camada quando cada `<img>` termina de carregar.
 * Não altera componentes de hero congelados — aplica-se no wrapper do gate.
 */
export function useHeroProgressiveImages(
  rootRef: RefObject<HTMLElement | null>,
  activeKey: string | null,
): void {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !activeKey) return;

    const markReady = (img: HTMLImageElement) => {
      img.classList.add('lh-hero-img-ready');
    };

    const imgs = Array.from(root.querySelectorAll('img'));
    const cleanups: Array<() => void> = [];

    for (const img of imgs) {
      if (img.complete && img.naturalWidth > 0) {
        markReady(img);
        continue;
      }
      const onLoad = () => markReady(img);
      const onError = () => markReady(img);
      img.addEventListener('load', onLoad, { once: true });
      img.addEventListener('error', onError, { once: true });
      cleanups.push(() => {
        img.removeEventListener('load', onLoad);
        img.removeEventListener('error', onError);
      });
    }

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [rootRef, activeKey]);
}
