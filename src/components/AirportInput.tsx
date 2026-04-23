import { useState, useRef, useEffect, useCallback } from 'react';
import { AIRPORTS } from '../data/airports';
import type { Airport } from '../data/airports';

interface Props {
  label: string;
  value: string; // IATA code
  onChange: (iata: string) => void;
}

// Metro/city code aliases → real city name for search
const CITY_ALIASES: Record<string, string> = {
  NYC: 'New York',
  CHI: 'Chicago',
  LON: 'London',
  PAR: 'Paris',
  TYO: 'Tokyo',
  OSA: 'Osaka',
  MIL: 'Milan',
  BUE: 'Buenos Aires',
  WAS: 'Washington',
  YTO: 'Toronto',
  YMQ: 'Montreal',
  REK: 'Reykjavik',
  RIO: 'Rio de Janeiro',
  SAO: 'São Paulo',
};

function search(query: string): Airport[] {
  const raw = query.trim();
  if (!raw) return [];
  const q = raw.toUpperCase();
  const aliasCity = CITY_ALIASES[q];           // e.g. "NYC" → "New York"
  const ql = (aliasCity ?? raw).toLowerCase(); // search by alias city or raw query

  const iataMatches: Airport[] = [];
  const cityMatches: Airport[] = [];
  const nameMatches: Airport[] = [];

  for (const airport of AIRPORTS) {
    if (!aliasCity && airport.iata.startsWith(q)) {
      iataMatches.push(airport);
    } else if (airport.city.toLowerCase().includes(ql)) {
      cityMatches.push(airport);
    } else if (airport.name.toLowerCase().includes(ql)) {
      nameMatches.push(airport);
    }
  }

  return [...iataMatches, ...cityMatches, ...nameMatches].slice(0, 8);
}

export default function AirportInput({ label, value, onChange }: Props) {
  const [inputText, setInputText] = useState(value);
  const [results, setResults] = useState<Airport[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value changes (e.g. reset)
  useEffect(() => {
    setInputText(value);
  }, [value]);

  const handleChange = useCallback((text: string) => {
    // Strip digits — airport codes and city names are letters only
    text = text.replace(/[0-9]/g, '');
    setInputText(text);
    setActiveIdx(0);
    if (text.trim().length === 0) {
      setResults([]);
      setOpen(false);
      onChange('');
      return;
    }
    const found = search(text);
    setResults(found);
    setOpen(found.length > 0);
    onChange('');
  }, [onChange]);

  const selectAirport = useCallback((airport: Airport) => {
    setInputText(airport.iata);
    onChange(airport.iata);
    setOpen(false);
    setResults([]);
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[activeIdx]) selectAirport(results[activeIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }, [open, results, activeIdx, selectAirport]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  return (
    <div className="flex-1 min-w-28 relative" ref={containerRef}>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        ref={inputRef}
        type="text"
        value={inputText}
        onChange={e => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (results.length > 0) setOpen(true); }}
        placeholder="SEA"
        autoComplete="off"
        spellCheck={false}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {results.map((airport, i) => (
            <li
              key={airport.iata}
              onPointerDown={e => { e.preventDefault(); selectAirport(airport); }}
              className={`px-3 py-2 cursor-pointer text-sm flex gap-2 items-baseline ${i === activeIdx ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
            >
              <span className="font-mono font-semibold text-blue-700 shrink-0">{airport.iata}</span>
              <span className="text-gray-600 truncate">{airport.city ? `${airport.city} — ` : ''}{airport.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
