import type { Airline } from '../types';

export interface AirlineRecord {
  name:        string;
  iata:        string;
  type:        Airline;
  category:    'oneworld' | 'earn_redeem' | 'book_direct';
}

export const AIRLINES: AirlineRecord[] = [
  // ── Alaska & Hawaiian ─────────────────────────────────────────────────────
  { name: 'Alaska Airlines',          iata: 'AS', type: 'alaska',   category: 'book_direct' },
  { name: 'Hawaiian Airlines',        iata: 'HA', type: 'hawaiian', category: 'book_direct' },

  // ── Oneworld partners ─────────────────────────────────────────────────────
  { name: 'American Airlines',        iata: 'AA', type: 'partner',  category: 'oneworld' },
  { name: 'British Airways',          iata: 'BA', type: 'partner',  category: 'oneworld' },
  { name: 'Cathay Pacific',           iata: 'CX', type: 'partner',  category: 'oneworld' },
  { name: 'Fiji Airways',             iata: 'FJ', type: 'partner',  category: 'oneworld' },
  { name: 'Finnair',                  iata: 'AY', type: 'partner',  category: 'oneworld' },
  { name: 'Iberia',                   iata: 'IB', type: 'partner',  category: 'oneworld' },
  { name: 'Japan Airlines',           iata: 'JL', type: 'partner',  category: 'oneworld' },
  { name: 'Malaysia Airlines',        iata: 'MH', type: 'partner',  category: 'oneworld' },
  { name: 'Oman Air',                 iata: 'WY', type: 'partner',  category: 'oneworld' },
  { name: 'Qantas',                   iata: 'QF', type: 'partner',  category: 'oneworld' },
  { name: 'Qatar Airways',            iata: 'QR', type: 'partner',  category: 'oneworld' },
  { name: 'Royal Air Maroc',          iata: 'AT', type: 'partner',  category: 'oneworld' },
  { name: 'Royal Jordanian',          iata: 'RJ', type: 'partner',  category: 'oneworld' },
  { name: 'SriLankan Airlines',       iata: 'UL', type: 'partner',  category: 'oneworld' },

  // ── Earn & redeem partners ────────────────────────────────────────────────
  { name: 'Aer Lingus',               iata: 'EI', type: 'partner',  category: 'earn_redeem' },
  { name: 'Air Tahiti Nui',           iata: 'TN', type: 'partner',  category: 'earn_redeem' },
  { name: 'Condor',                   iata: 'DE', type: 'partner',  category: 'earn_redeem' },
  { name: 'Hainan Airlines',          iata: 'HU', type: 'partner',  category: 'earn_redeem' },
  { name: 'Icelandair',               iata: 'FI', type: 'partner',  category: 'earn_redeem' },
  { name: 'Korean Air',               iata: 'KE', type: 'partner',  category: 'earn_redeem' },
  { name: 'Porter Airlines',          iata: 'PD', type: 'partner',  category: 'earn_redeem' },
  { name: 'STARLUX Airlines',         iata: 'JX', type: 'partner',  category: 'earn_redeem' },

  // ── Book direct ───────────────────────────────────────────────────────────
  { name: 'Aleutian Airways',         iata: 'K5', type: 'partner',  category: 'book_direct' },
  { name: 'Bahamasair',               iata: 'UP', type: 'partner',  category: 'book_direct' },
  { name: 'Cape Air',                 iata: '9K', type: 'partner',  category: 'book_direct' },
  { name: 'Contour Airlines',         iata: 'LF', type: 'partner',  category: 'book_direct' },
  { name: 'ITA Airways',              iata: 'AZ', type: 'partner',  category: 'book_direct' },
  { name: 'Kenmore Air',              iata: 'M5', type: 'partner',  category: 'book_direct' },
  { name: 'Mokulele Airlines',        iata: 'MW', type: 'partner',  category: 'book_direct' },
  { name: 'Philippine Airlines',      iata: 'PR', type: 'partner',  category: 'book_direct' },
  { name: 'Singapore Airlines',       iata: 'SQ', type: 'partner',  category: 'book_direct' },
  { name: 'Southern Airways Express', iata: '9X', type: 'partner',  category: 'book_direct' },
];

// Fast lookup by IATA code
export const AIRLINE_BY_IATA: Record<string, AirlineRecord> =
  Object.fromEntries(AIRLINES.map(a => [a.iata, a]));

const CATEGORY_LABEL: Record<AirlineRecord['category'], string> = {
  oneworld:    'Oneworld Partners',
  earn_redeem: 'Earn & Redeem Partners',
  book_direct: 'Book Direct',
};

// Airlines grouped for rendering an optgroup dropdown
export const AIRLINES_BY_CATEGORY = (['oneworld', 'earn_redeem', 'book_direct'] as const).map(cat => ({
  label:    CATEGORY_LABEL[cat],
  airlines: AIRLINES.filter(a => a.category === cat),
}));
