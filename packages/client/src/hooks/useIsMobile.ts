import { useEffect, useState } from 'react';

// Возвращает true, когда ширина окна не превышает breakpoint (по умолчанию 640px —
// телефонные разрешения). Подписывается на изменение через matchMedia, поэтому
// корректно реагирует на ресайз окна в реальном времени.
export function useIsMobile(breakpoint: number = 640): boolean {
  const query = `(max-width: ${breakpoint}px)`;
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return isMobile;
}
