import { useEffect, useState, useMemo } from 'react';
import { HOLDERS_COUNT, getCategoryImagesForHolder } from '../data/categoryData';

export interface PreloadState {
  isLoaded: boolean;
  loadedCount: number;
  totalCount: number;
  isUrlLoaded: (url: string) => boolean;
}

export function useCategoryImagesPreloader(): PreloadState {
  const allUrls = useMemo(() => {
    const urls: string[] = [];
    for (let hIdx = 0; hIdx < HOLDERS_COUNT; hIdx++) {
      const holderUrls = getCategoryImagesForHolder(hIdx);
      holderUrls.forEach((url) => {
        if (url && !urls.includes(url)) {
          urls.push(url);
        }
      });
    }
    return urls;
  }, []);

  const [loadedUrls, setLoadedUrls] = useState<Set<string>>(() => new Set());
  const [loadedCount, setLoadedCount] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined' || allUrls.length === 0) {
      setIsLoaded(true);
      return;
    }

    let active = true;
    let completed = 0;
    const total = allUrls.length;

    const handleSingleComplete = (url: string) => {
      if (!active) return;
      completed += 1;
      setLoadedCount(completed);
      setLoadedUrls((prev) => {
        const next = new Set(prev);
        next.add(url);
        return next;
      });
      if (completed >= total) {
        setIsLoaded(true);
      }
    };

    allUrls.forEach((url) => {
      const img = new Image();
      img.src = url;

      if (img.decode) {
        img
          .decode()
          .then(() => handleSingleComplete(url))
          .catch(() => handleSingleComplete(url));
      } else if (img.complete) {
        handleSingleComplete(url);
      } else {
        img.onload = () => handleSingleComplete(url);
        img.onerror = () => handleSingleComplete(url);
      }
    });

    return () => {
      active = false;
    };
  }, [allUrls]);

  const isUrlLoaded = (url: string): boolean => {
    if (isLoaded) return true;
    return loadedUrls.has(url);
  };

  return {
    isLoaded,
    loadedCount,
    totalCount: allUrls.length,
    isUrlLoaded,
  };
}
