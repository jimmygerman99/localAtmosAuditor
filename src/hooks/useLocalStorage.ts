import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';

const STORAGE_VERSION = 2;
const VERSION_KEY = 'audit_storage_version';

if (typeof window !== 'undefined') {
  const stored = localStorage.getItem(VERSION_KEY);
  if (stored !== String(STORAGE_VERSION)) {
    Object.keys(localStorage)
      .filter(k => k.startsWith('audit_'))
      .forEach(k => localStorage.removeItem(k));
    localStorage.setItem(VERSION_KEY, String(STORAGE_VERSION));
  }
}

export function useLocalStorage<T>(key: string, defaultValue: T): [T, Dispatch<SetStateAction<T>>] {
  const prefixedKey = `audit_${key}`;

  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(prefixedKey);
      return item !== null ? (JSON.parse(item) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(prefixedKey, JSON.stringify(value));
    } catch {
      // localStorage might be full or unavailable
    }
  }, [prefixedKey, value]);

  return [value, setValue];
}
