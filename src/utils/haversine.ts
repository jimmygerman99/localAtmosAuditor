import { AIRPORT_MAP } from '../data/airports';

const R = 3958.8; // Earth radius in miles

export function haversineDistance(iata1: string, iata2: string): number {
  const a = AIRPORT_MAP[iata1.toUpperCase()];
  const b = AIRPORT_MAP[iata2.toUpperCase()];
  if (!a || !b) return 0;

  const dLat = (b.lat - a.lat) * (Math.PI / 180);
  const dLon = (b.lon - a.lon) * (Math.PI / 180);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * (Math.PI / 180)) * Math.cos(b.lat * (Math.PI / 180)) *
    Math.sin(dLon / 2) ** 2;

  return Math.round(R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}
