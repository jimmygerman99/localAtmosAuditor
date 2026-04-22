import type { Airline, FareClass } from '../types';

export interface CsvFlightRow {
  date: string;
  airlineName: string;
  airline: Airline;
  operatingCarrier: string;
  flightNumber: string;
  origin: string;
  destination: string;
  fareClass: FareClass;
  pointsEarned: number;
  statusPointsEarned: number;
}

export interface CsvRedemptionRow {
  transactionDate: string; // YYYY-MM-DD — when points were deducted, NOT the flight date
  airlineName: string;
  airline: Airline;
  operatingCarrier: string;
  carrierCode: string;     // e.g. "AA"
  origin: string;
  destination: string;
  confirmationCode: string;
  passengerName: string;
  pointsRedeemed: number;  // positive value
}

export interface CsvParseResult {
  earned: CsvFlightRow[];
  redemptions: CsvRedemptionRow[];
}

// Partner booking class letter → FareClass
const PARTNER_BOOKING_CLASS: Record<string, FareClass> = {
  Y: 'economy', B: 'economy', M: 'economy',
  K: 'economy', H: 'economy', Q: 'economy', V: 'economy', W: 'economy',
  L: 'economy_discount', S: 'economy_discount', N: 'economy_discount',
  O: 'economy_discount', G: 'economy_discount', U: 'economy_discount', T: 'economy_discount',
  J: 'business', C: 'business', D: 'business', I: 'business', R: 'business',
  F: 'first', A: 'first',
  P: 'domestic_first',
  E: 'premium_economy', Z: 'premium_economy',
};

const AIRLINE_NAME_MAP: [RegExp, Airline, string][] = [
  [/alaska airlines/i,    'alaska',   ''],
  [/hawaiian airlines/i,  'hawaiian', ''],
  [/american airlines/i,  'partner',  'American Airlines'],
  [/united airlines/i,    'partner',  'United Airlines'],
  [/delta air lines/i,    'partner',  'Delta Air Lines'],
  [/british airways/i,    'partner',  'British Airways'],
  [/japan airlines/i,     'partner',  'Japan Airlines'],
  [/cathay pacific/i,     'partner',  'Cathay Pacific'],
  [/air canada/i,         'partner',  'Air Canada'],
  [/\blufthansa\b/i,      'partner',  'Lufthansa'],
  [/\bqantas\b/i,         'partner',  'Qantas'],
  [/qatar airways/i,      'partner',  'Qatar Airways'],
  [/\bemirates\b/i,       'partner',  'Emirates'],
  [/etihad airways/i,     'partner',  'Etihad Airways'],
  [/singapore airlines/i, 'partner',  'Singapore Airlines'],
  [/\bjetblue\b/i,        'partner',  'JetBlue'],
  [/southwest airlines/i, 'partner',  'Southwest Airlines'],
  [/air france/i,         'partner',  'Air France'],
  [/\bklm\b/i,            'partner',  'KLM'],
  [/korean air/i,         'partner',  'Korean Air'],
];

function detectAirlineName(name: string): { airline: Airline; operatingCarrier: string } {
  for (const [re, airline, carrier] of AIRLINE_NAME_MAP) {
    if (re.test(name)) return { airline, operatingCarrier: carrier };
  }
  return { airline: 'partner', operatingCarrier: name.trim() };
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      fields.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

function parseDate(raw: string): string {
  const [mm, dd, yyyy] = raw.trim().split('/');
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

// Earned: "ROUTE CARRIER+FLIGHT# FARE_CLASS"  e.g. "DFW-CLE AA1607 S"
const EARNED_RE = /^([A-Z]{3})-([A-Z]{3})\s+([A-Z]{1,2})(\d{1,4})\s+([A-Z])$/;

// Redeemed: "CARRIER ROUTE CONFIRMATIONCODE"  e.g. "AA ORD-CLE KTPRVP"
// Confirmation codes are 5-8 uppercase alphanumeric characters
const REDEEMED_RE = /^([A-Z]{1,2})\s+([A-Z]{3})-([A-Z]{3})\s+([A-Z0-9]{5,8})$/;

export function parseCsvActivity(csvText: string): CsvParseResult {
  const lines = csvText.replace(/\r/g, '').split('\n').filter(l => l.trim());
  const result: CsvParseResult = { earned: [], redemptions: [] };
  if (lines.length < 2) return result;

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < 7) continue;

    const [rawDate, activity, status, rawPoints, , , rawStatusPoints] = cols;
    const statusTrimmed = status.trim();

    // Activity always starts with "AIRLINE_NAME  REST"
    const dblSpaceIdx = activity.indexOf('  ');
    if (dblSpaceIdx === -1) continue;

    const airlineName = activity.slice(0, dblSpaceIdx).trim();
    // For redemptions there may be a second double-space before passenger name
    const afterAirline = activity.slice(dblSpaceIdx + 2);
    const secondDbl = afterAirline.indexOf('  ');
    const rest = (secondDbl !== -1 ? afterAirline.slice(0, secondDbl) : afterAirline).trim();
    const passengerName = secondDbl !== -1 ? afterAirline.slice(secondDbl + 2).trim() : '';

    const { airline, operatingCarrier } = detectAirlineName(airlineName);

    if (statusTrimmed === 'Credited') {
      const m = EARNED_RE.exec(rest);
      if (!m) continue;
      const [, origin, destination, , flightNumber, fareClassLetter] = m;
      result.earned.push({
        date: parseDate(rawDate),
        airlineName: airlineName.trim(),
        airline,
        operatingCarrier,
        flightNumber,
        origin,
        destination,
        fareClass: PARTNER_BOOKING_CLASS[fareClassLetter] ?? 'economy',
        pointsEarned: parseInt(rawPoints.trim(), 10) || 0,
        statusPointsEarned: parseInt(rawStatusPoints.trim(), 10) || 0,
      });
    } else if (statusTrimmed === 'Redeemed') {
      const m = REDEEMED_RE.exec(rest);
      if (!m) continue;
      const [, carrierCode, origin, destination, confirmationCode] = m;
      result.redemptions.push({
        transactionDate: parseDate(rawDate),
        airlineName: airlineName.trim(),
        airline,
        operatingCarrier,
        carrierCode,
        origin,
        destination,
        confirmationCode,
        passengerName,
        pointsRedeemed: Math.abs(parseInt(rawPoints.trim(), 10) || 0),
      });
    }
  }

  return result;
}
