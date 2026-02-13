import * as React from "react";
import {
  getImageKitUrl,
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

  const optimizedSrc = getImageKitUrl(rawSrc, options);
  const srcSet =
    widths && widths.length > 0
      ? getResponsiveSrcset(rawSrc, options, widths)
      : undefined;

  const [useFallback, setUseFallback] = React.useState(false);

  // Reset fallback when src changes.
  React.useEffect(() => {
    setUseFallback(false);
  }, [rawSrc]);

  const finalSrc = useFallback ? rawSrc : optimizedSrc;
  const finalSrcSet = useFallback ? undefined : srcSet || undefined;

  const onError: React.ReactEventHandler<HTMLImageElement> = (e) => {
    // If ImageKit isn't configured to fetch this remote URL yet, fall back to the original URL.
    if (!useFallback && optimizedSrc !== rawSrc) {
      setUseFallback(true);
    }
    rest.onError?.(e);
  };

  return (
    <img
      ref={ref}
      src={finalSrc}
      srcSet={finalSrcSet}
      sizes={finalSrcSet ? sizes : undefined}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      fetchPriority={priority ? "high" : undefined}
      onError={onError}
      {...rest}
    />
  );
});

OptimizedImage.displayName = "OptimizedImage";
