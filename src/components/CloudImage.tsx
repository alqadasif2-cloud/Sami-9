import React, { useState, useEffect } from 'react';
import { getCachedMediaData } from '../services/firebase';

interface CloudImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  alt?: string;
  className?: string;
}

export const CloudImage: React.FC<CloudImageProps> = ({
  src,
  alt = '',
  className = '',
  ...props
}) => {
  const [currentSrc, setCurrentSrc] = useState<string | null>(() => getCachedMediaData(src));
  const [isLoading, setIsLoading] = useState<boolean>(() => !(!src || !!getCachedMediaData(src)));
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    if (!src) {
      setCurrentSrc(null);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    const cached = getCachedMediaData(src);
    if (cached) {
      setCurrentSrc(cached);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    setIsLoading(true);
    setHasError(false);
    setCurrentSrc(src);
    setIsLoading(false);

    return () => {
      isMounted = false;
    };
  }, [src]);

  if (!src || hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-900/80 text-slate-500 text-xs border border-slate-800 ${className}`}
        style={{ minHeight: '2.5rem', minWidth: '2.5rem' }}
      >
        <span>لا توجد صورة</span>
      </div>
    );
  }

  if (isLoading || !currentSrc) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-900/70 animate-pulse ${className}`}
        style={{ minHeight: '2.5rem', minWidth: '2.5rem' }}
      >
        <span className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setHasError(true)}
      {...props}
    />
  );
};
