import * as React from "react";
import {
  getOptimizedUrl,
  getResponsiveSrcset,
  IMAGE_PRESETS,
  type ImagePreset,
  type ImageTransformOptions,
} from "@/lib/onmx/image";

type OptimizedImageProps = Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "srcSet"
> & {
  preset?: ImagePreset;
  transforms?: ImageTransformOptions;
  widths?: number[];
  priority?: boolean;
};

export const OptimizedImage = React.forwardRef<
  HTMLImageElement,
  OptimizedImageProps
>(({ src, preset, transforms, widths, sizes, priority, ...rest }, ref) => {
  if (!src) return null;

  const rawSrc = String(src);

  const options: ImageTransformOptions = {
    ...(preset ? IMAGE_PRESETS[preset] : {}),
    ...transforms,
  };

  const optimizedSrc = getOptimizedUrl(rawSrc, options);
  const srcSet =
    widths && widths.length > 0
      ? getResponsiveSrcset(rawSrc, options, widths)
      : undefined;

  return (
    <img
      ref={ref}
      src={optimizedSrc}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      {...rest}
    />
  );
});

OptimizedImage.displayName = "OptimizedImage";
