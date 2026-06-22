import type { ReactNode } from 'react';
import { clsx } from 'clsx';

type ImageFit = 'cover' | 'top-contain';

type Props = {
  imageSrc: string;
  objectPosition?: string;
  imageTransform?: string;
  imageTransformOrigin?: string;
  imageMask?: string;
  imageFit?: ImageFit;
  imageTopHeight?: string;
  /** Cover mode: rendered height (default 100%). Use >100% + translateY to crop baked-in top padding in assets. */
  imageHeight?: string;
  bottomFadeHeight?: string;
  eager?: boolean;
  /** Card 6 — coin reveal pop on the hero image */
  celebrationImageReveal?: boolean;
  children: ReactNode;
  contentBottomOffset?: string;
};

const DEFAULT_IMAGE_MASK =
  'linear-gradient(to bottom, rgba(0,0,0,1) 58%, rgba(0,0,0,0.92) 72%, rgba(0,0,0,0.55) 86%, rgba(0,0,0,0.15) 94%, transparent 100%)';

export function TutorialImmersiveHero({
  imageSrc,
  objectPosition = 'center 35%',
  imageTransform,
  imageTransformOrigin = 'center top',
  imageMask = DEFAULT_IMAGE_MASK,
  imageFit = 'cover',
  imageTopHeight = '50%',
  imageHeight = '100%',
  bottomFadeHeight = '48%',
  eager = false,
  celebrationImageReveal = false,
  children,
  contentBottomOffset = 'calc(8.75rem + max(env(safe-area-inset-bottom), 0px))',
}: Props) {
  const isTopContain = imageFit === 'top-contain';

  const coverImageStyle = {
    height: imageHeight,
    objectPosition,
    transform: imageTransform,
    transformOrigin: imageTransformOrigin,
    WebkitMaskImage: imageMask,
    maskImage: imageMask,
  } as const;

  const coverImage = (
    <img
      src={imageSrc}
      alt=""
      className={clsx(
        'absolute inset-x-0 top-0 w-full object-cover',
        celebrationImageReveal && 'lh-tutorial-celebration-hero-img',
      )}
      style={coverImageStyle}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
    />
  );

  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-[#F3F8FF] to-[#FAFCFF]">
      {isTopContain ? (
        <img
          src={imageSrc}
          alt=""
          className="absolute left-0 right-0 top-0 mx-auto w-full max-w-full object-contain object-top"
          style={
            isTopContain
              ? {
                  height: imageTopHeight,
                  transform: imageTransform,
                  transformOrigin: imageTransformOrigin,
                }
              : undefined
          }
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
        />
      ) : celebrationImageReveal ? (
        <div className="lh-tutorial-celebration-scene absolute inset-0">{coverImage}</div>
      ) : (
        coverImage
      )}

      {isTopContain ? (
        <div
          className="pointer-events-none absolute inset-x-0"
          style={{
            top: `calc(${imageTopHeight} - 3.5rem)`,
            height: '5rem',
            background: 'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.55) 55%, rgba(255,255,255,0.92) 100%)',
          }}
          aria-hidden
        />
      ) : null}

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0"
        style={{
          height: bottomFadeHeight,
          background:
            'linear-gradient(to top, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.42) 38%, rgba(255,255,255,0.08) 72%, transparent 100%)',
        }}
        aria-hidden
      />

      <div
        className="pointer-events-none absolute inset-x-0 bottom-[14%] h-32 bg-[radial-gradient(ellipse_at_center,rgba(37,99,255,0.12),transparent_72%)] blur-[1px]"
        aria-hidden
      />

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] backdrop-blur-[2px] backdrop-saturate-125"
        style={{
          WebkitMaskImage: 'linear-gradient(to top, black 0%, black 28%, transparent 100%)',
          maskImage: 'linear-gradient(to top, black 0%, black 28%, transparent 100%)',
        }}
        aria-hidden
      />

      <div className="absolute inset-x-0 z-20 px-6" style={{ bottom: contentBottomOffset }}>
        {children}
      </div>
    </div>
  );
}

/** Card 1 — welcome hero; recorte vertical para subir a composição. */
export const TUTORIAL_WELCOME_HERO = {
  objectPosition: 'center top',
  imageHeight: '100%',
  imageTransform: 'translateY(-12%)',
  imageTransformOrigin: 'center top',
};

/** Card 2 — largura do card, topo alinhado, texto acima dos botões (voltar + primário). */
export const TUTORIAL_PUBLISH_HERO = {
  imageFit: 'cover' as const,
  objectPosition: 'center top',
  imageHeight: '100%',
  imageTransform: 'translateY(-22%)',
  imageTransformOrigin: 'center top',
  imageMask:
    'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 48%, rgba(0,0,0,0.85) 62%, rgba(0,0,0,0.38) 78%, transparent 100%)',
  bottomFadeHeight: '40%',
  contentBottomOffset: 'calc(10.25rem + max(env(safe-area-inset-bottom), 0px))',
};

/** Card 3 — mapa full-bleed, card único premium. */
export const TUTORIAL_NEARBY_HERO = {
  imageFit: 'cover' as const,
  objectPosition: 'center top',
  imageHeight: '100%',
  imageTransform: 'translateY(-12%)',
  imageTransformOrigin: 'center top',
  imageMask:
    'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0.88) 64%, rgba(0,0,0,0.42) 80%, transparent 100%)',
  bottomFadeHeight: '42%',
  contentBottomOffset: 'calc(10.25rem + max(env(safe-area-inset-bottom), 0px))',
};

/** Card 4 — compare propostas, full-bleed premium. */
export const TUTORIAL_COMPARE_HERO = {
  imageFit: 'cover' as const,
  objectPosition: 'center top',
  imageHeight: '100%',
  imageTransform: 'translateY(-10%)',
  imageTransformOrigin: 'center top',
  imageMask:
    'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0.88) 64%, rgba(0,0,0,0.42) 80%, transparent 100%)',
  bottomFadeHeight: '42%',
  contentBottomOffset: 'calc(10.25rem + max(env(safe-area-inset-bottom), 0px))',
};

/** Card 5 — chat seguro, full-bleed premium. */
export const TUTORIAL_SECURE_CHAT_HERO = {
  imageFit: 'cover' as const,
  objectPosition: 'center top',
  imageHeight: '100%',
  imageTransform: 'translateY(-14%) scale(0.90)',
  imageTransformOrigin: 'center top',
  imageMask:
    'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0.88) 64%, rgba(0,0,0,0.42) 80%, transparent 100%)',
  bottomFadeHeight: '42%',
  contentBottomOffset: 'calc(10.25rem + max(env(safe-area-inset-bottom), 0px))',
};

/** Card 6 — LinkCredits bônus, full-bleed premium. */
export const TUTORIAL_LINK_CREDITS_HERO = {
  imageFit: 'cover' as const,
  objectPosition: 'center top',
  imageHeight: '100%',
  imageTransform: 'translateY(-18%) scale(1)',
  imageTransformOrigin: 'center top',
  imageMask:
    'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 48%, rgba(0,0,0,0.88) 62%, rgba(0,0,0,0.42) 78%, transparent 100%)',
  bottomFadeHeight: '44%',
  contentBottomOffset: 'calc(10rem + max(env(safe-area-inset-bottom), 0px))',
};
