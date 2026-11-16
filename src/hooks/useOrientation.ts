import { useEffect, useState } from 'react';

export interface ViewportOrientation {
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
  isCompactLandscape: boolean;
  isMobile: boolean;
}

function measure(): ViewportOrientation {
  if (typeof window === 'undefined') {
    return {
      width: 1440,
      height: 900,
      orientation: 'landscape',
      isCompactLandscape: false,
      isMobile: false,
    };
  }
  const width = window.innerWidth;
  const height = window.innerHeight;
  const orientation = width >= height ? 'landscape' : 'portrait';
  return {
    width,
    height,
    orientation,
    isCompactLandscape: orientation === 'landscape' && height <= 540,
    isMobile: width < 640,
  };
}

export function useOrientation(): ViewportOrientation {
  const [info, setInfo] = useState<ViewportOrientation>(measure);

  useEffect(() => {
    const onResize = () => setInfo(measure());
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  return info;
}
