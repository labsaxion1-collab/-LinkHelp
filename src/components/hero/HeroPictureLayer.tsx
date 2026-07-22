import type { ImgHTMLAttributes } from 'react';
import {
  clientConfiavelPrimarySrc,
  isClientConfiavelHeroWebpEnabled,
  type ClientConfiavelHeroMediaLayer,
} from '@/gamification/hero/clientConfiavelHeroMedia';

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  layer: ClientConfiavelHeroMediaLayer;
};

/**
 * `<picture>` WebP + fallback PNG — mesmas classes/dimensões do `<img>` original.
 */
export function HeroPictureLayer({ layer, className, alt = '', ...rest }: Props) {
  const useWebp = isClientConfiavelHeroWebpEnabled();

  if (!useWebp) {
    return <img src={layer.png} className={className} alt={alt} {...rest} />;
  }

  return (
    <picture className="contents">
      <source srcSet={layer.webp} type="image/webp" />
      <img src={layer.png} className={className} alt={alt} {...rest} />
    </picture>
  );
}

export function heroMedalPedestalSrc(layer: ClientConfiavelHeroMediaLayer): string {
  return clientConfiavelPrimarySrc(layer);
}
