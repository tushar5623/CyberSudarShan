import { useCallback, useEffect, useRef } from 'react';

// Replace an older timer and cancel the remaining callback on unmount.
export function useTimeout() {
  const timer = useRef(null);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      clearTimeout(timer.current);
    };
  }, []);
  return useCallback((callback, delay) => {
    if (!active.current) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(callback, delay);
  }, []);
}
