import { useState, useCallback } from 'react';

export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setInternalValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setValue = useCallback((update: T | ((prev: T) => T)) => {
    setInternalValue(prev => {
      const next = typeof update === 'function'
        ? (update as (prev: T) => T)(prev)
        : update;
      try {
        if (next === null || next === undefined) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, JSON.stringify(next));
        }
      } catch {
        // Storage full or unavailable — value still updates in memory
      }
      return next;
    });
  }, [key]);

  return [value, setValue];
}
