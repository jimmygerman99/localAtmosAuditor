import type { Airline, BookingChannel, FareClass } from '../types';
import { AIRPORTS } from '../data/airports';

export interface ParsedFlight {
  // Core segment fields
  flightNumber?: string;
  origin?: string;
  destination?: string;
  date?: string;            // YYYY-MM-DD
  departureTime?: string;   // "5:46 PM" or "17:46"
  arrivalTime?: string;

  // Booking fields (shared across all legs in a confirmation)
  bookingReference?: string;
  ticketNumber?: string;
  airline?: Airline;
  operatingCarrier?: string;
  fareClass?: FareClass;
  bookingChannel?: BookingChannel;
  bookedWithPoints?: boolean;
  pointsRedeemed?: number;
  ticketPrice?: number;
  memberNumber?: string;
  passengerName?: string;
}

// ─── Airport validation ───────────────────────────────────────────────────────
// Build a set of all known IATA codes so we never match "THE", "FOR", etc.

const VALID_IATA = new Set(AIRPORTS.map(a => a.iata));

function isIATA(code: string): boolean {
  return VALID_IATA.has(code.toUpperCase());
}

// ─── Carrier code map ─────────────────────────────────────────────────────────

const CARRIER_CODE_MAP: Record<string, [Airline, string]> = {
  AS: ['alaska',   ''],
  HA: ['hawaiian', ''],
  AA: ['partner',  'American Airlines'],
  BA: ['partner',  'British Airways'],
  DL: ['partner',  'Delta Air Lines'],
  UA: ['partner',  'United Airlines'],
  JL: ['partner',  'Japan Airlines'],
  QF: ['partner',  'Qantas'],
  QR: ['partner',  'Qatar Airways'],
  EK: ['partner',  'Emirates'],
  CX: ['partner',  'Cathay Pacific'],
  AC: ['partner',  'Air Canada'],
  LH: ['partner',  'Lufthansa'],
  AF: ['partner',  'Air France'],
  KL: ['partner',  'KLM'],
  NZ: ['partner',  'Air New Zealand'],
  SQ: ['partner',  'Singapore Airlines'],
  IB: ['partner',  'Iberia'],
  AY: ['partner',  'Finnair'],
  TK: ['partner',  'Turkish Airlines'],
  NH: ['partner',  'ANA'],
  OZ: ['partner',  'Asiana Airlines'],
  KE: ['partner',  'Korean Air'],
  B6: ['partner',  'JetBlue'],
  WN: ['partner',  'Southwest Airlines'],
  F9: ['partner',  'Frontier Airlines'],
  MX: ['partner',  'Mexicana'],
  CM: ['partner',  'Copa Airlines'],
  LA: ['partner',  'LATAM Airlines'],
  AV: ['partner',  'Avianca'],
  TP: ['partner',  'TAP Air Portugal'],
  LX: ['partner',  'Swiss International'],
  OS: ['partner',  'Austrian Airlines'],
  SK: ['partner',  'Scandinavian Airlines'],
  AZ: ['partner',  'ITA Airways'],
  VS: ['partner',  'Virgin Atlantic'],
  VX: ['partner',  'Virgin America'],
  WS: ['partner',  'WestJet'],
  NK: ['partner',  'Spirit Airlines'],
  G4: ['partner',  'Allegiant Air'],
  EY: ['partner',  'Etihad Airways'],
  TG: ['partner',  'Thai Airways'],
  CI: ['partner',  'China Airlines'],
  CA: ['partner',  'Air China'],
  MU: ['partner',  'China Eastern'],
  CZ: ['partner',  'China Southern'],
  ET: ['partner',  'Ethiopian Airlines'],
  GA: ['partner',  'Garuda Indonesia'],
  MH: ['partner',  'Malaysia Airlines'],
  VN: ['partner',  'Vietnam Airlines'],
  PR: ['partner',  'Philippine Airlines'],
  BR: ['partner',  'EVA Air'],
  SV: ['partner',  'Saudia'],
  MS: ['partner',  'EgyptAir'],
  RJ: ['partner',  'Royal Jordanian'],
  LO: ['partner',  'LOT Polish Airlines'],
  OK: ['partner',  'Czech Airlines'],
  SN: ['partner',  'Brussels Airlines'],
  HM: ['partner',  'Air Seychelles'],
  UL: ['partner',  'SriLankan Airlines'],
  AI: ['partner',  'Air India'],
  WY: ['partner',  'Oman Air'],
  ME: ['partner',  'Middle East Airlines'],
  GF: ['partner',  'Gulf Air'],
  PG: ['partner',  'Bangkok Airways'],
  '6E': ['partner', 'IndiGo'],
  WB: ['partner',  'Rwandair'],
  SW: ['partner',  'Air Namibia'],
  RA: ['partner',  'Nepal Airlines'],
};

const CARRIER_RE = new RegExp(
  `\\b(${Object.keys(CARRIER_CODE_MAP).join('|')})\\s*(\\d{1,4})\\b`,
  'g',
);

// ─── Fare class normalizer ────────────────────────────────────────────────────

const CABIN_FARE_MAP: [string, FareClass][] = [
  ['main cabin saver',     'saver'],
  ['main saver',           'saver'],
  ['first class full',     'first_full'],
  ['first full',           'first_full'],
  ['first class flexible', 'first_flexible'],
  ['first flexible',       'first_flexible'],
  ['first discount',       'first_discount'],
  ['main cabin full',      'main_full'],
  ['main full',            'main_full'],
  ['main cabin flexible',  'main_flexible'],
  ['main flexible',        'main_flexible'],
  ['main cabin',           'main'],
  ['main',                 'main'],
  ['coach',                'main'],
  ['first class',          'first_discount'],
  ['first',                'first_discount'],
  ['saver',                'saver'],
  ['basic economy',        'economy_discount'],
  ['basic',                'saver'],
  ['premium economy',      'premium_economy'],
  ['premium cabin',        'premium_economy'],
  ['world traveller plus', 'premium_economy'],
  ['club world',           'business'],
  ['business first',       'business'],
  ['business class',       'business'],
  ['business',             'business'],
  ['domestic first class', 'domestic_first'],
  ['domestic first',       'domestic_first'],
  ['economy discount',     'economy_discount'],
  ['economy light',        'economy_discount'],
  ['economy saver',        'economy_discount'],
  ['economy class',        'economy'],
  ['economy',              'economy'],
  ['light',                'economy_discount'],
];

const ALASKA_BOOKING_CLASS: Record<string, FareClass> = {
  A: 'first_full',   F: 'first_full',
  J: 'first_flexible',
  C: 'first_discount', D: 'first_discount', P: 'first_discount',
  Y: 'main_full',    B: 'main_full',    M: 'main_full',
  Z: 'main_flexible', E: 'main_flexible', K: 'main_flexible',
  H: 'main',         Q: 'main',         V: 'main',         W: 'main',
  L: 'saver',        S: 'saver',        N: 'saver',        O: 'saver', G: 'saver',
};

function normalizeCabin(cabin: string, airline: Airline): FareClass | undefined {
  const lower = cabin.toLowerCase().trim();
  for (const [name, cls] of CABIN_FARE_MAP) {
    if (lower.includes(name)) return cls;
  }
  if (airline !== 'partner' && /^[A-Z]$/.test(cabin.trim())) {
    return ALASKA_BOOKING_CLASS[cabin.trim()];
  }
  return undefined;
}

// ─── Text preprocessing ───────────────────────────────────────────────────────

function decodeQP(raw: string): string {
  return raw
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9A-Fa-f]{2})/g, (_, h: string) =>
      String.fromCharCode(parseInt(h, 16)));
}

// Repair QP-decoded text where UTF-8 multi-byte sequences were QP-encoded as
// individual bytes (e.g. =C2=A0 → 'Â '  should become ' ')
function fixUTF8(text: string): string {
  return text
    .replace(/[ÂÃ]([-¿])/g, (_m, b: string) =>
      String.fromCharCode(((_m.charCodeAt(0) & 0x1F) << 6) | (b.charCodeAt(0) & 0x3F)))
    .replace(/ /g, ' ');  // NBSP → regular space
}

function stripHTML(html: string): string {
  return html
    .replace(/<(script|style|head)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/?(br|hr)\s*\/?>/gi, '\n')
    .replace(/<\/?(tr|td|th|li|p|div|h[1-6])[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g,    (_, n: string) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCharCode(parseInt(h, 16)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Decode base64 bytes to a UTF-8 string
function base64ToUtf8(b64: string): string {
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return '';
  }
}

// Extract and decode all base64-encoded MIME parts (QR, EK, EY, and most intl airlines)
function decodeMIMEBase64(raw: string): string {
  const results: string[] = [];
  const sectionRe = /Content-Transfer-Encoding:\s*base64[\s\S]*?\r?\n\r?\n((?:[A-Za-z0-9+/=\r\n]+))/gi;
  let m: RegExpExecArray | null;
  while ((m = sectionRe.exec(raw)) !== null) {
    const decoded = base64ToUtf8(m[1].replace(/\s/g, ''));
    if (decoded.length > 50) results.push(decoded);
  }
  return results.join('\n');
}

function toPlainText(text: string): string {
  return /<html|<!DOCTYPE|<body|<div|<td/i.test(text) ? stripHTML(text) : text;
}

function normalize(raw: string): string {
  // .eml files from many airlines (QR, EK, EY...) use base64-encoded HTML parts
  if (/Content-Transfer-Encoding:\s*base64/i.test(raw)) {
    const decoded = decodeMIMEBase64(raw);
    if (decoded.length > 50) return toPlainText(decoded);
  }
  // QP-encoded .eml or plain HTML/text
  return toPlainText(fixUTF8(decodeQP(raw)));
}

// ─── Date / time helpers ──────────────────────────────────────────────────────

interface Located<T> { pos: number; value: T }

const MONTH_RE = 'Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?';

function findAllDates(text: string): Located<string>[] {
  const results: Located<string>[] = [];

  const add = (pos: number, dateStr: string) => {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const iso = d.toISOString().slice(0, 10);
      if (!results.some(r => r.pos === pos)) results.push({ pos, value: iso });
    }
  };

  // ISO
  for (const m of text.matchAll(/\b(\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]))\b/g)) {
    add(m.index!, m[1]);
  }
  // Mon DD, YYYY or Month DD YYYY (handles "February 1, 2026" and "Sun, Feb 1, 2026")
  const written = new RegExp(
    `(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\\s*)?(${MONTH_RE})\\s+(\\d{1,2}),?\\s+(\\d{4})`, 'gi',
  );
  for (const m of text.matchAll(written)) {
    add(m.index!, `${m[1]} ${m[2]}, ${m[3]}`);
  }
  // DD Mon YYYY
  const euro = new RegExp(`\\b(\\d{1,2})\\s+(${MONTH_RE})\\s+(\\d{4})\\b`, 'gi');
  for (const m of text.matchAll(euro)) {
    add(m.index!, `${m[2]} ${m[1]}, ${m[3]}`);
  }
  // MM/DD/YYYY or M/D/YY
  for (const m of text.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g)) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    add(m.index!, `${y}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`);
  }

  return results.sort((a, b) => a.pos - b.pos);
}

function findAllTimes(text: string): Located<string>[] {
  const results: Located<string>[] = [];
  for (const m of text.matchAll(/\b(\d{1,2}:\d{2})\s*(AM|PM|am|pm)?\b/g)) {
    results.push({ pos: m.index!, value: m[2] ? `${m[1]} ${m[2].toUpperCase()}` : m[1] });
  }
  return results;
}

function lastBefore<T>(items: Located<T>[], pos: number): T | undefined {
  let best: T | undefined;
  for (const item of items) {
    if (item.pos < pos) best = item.value;
  }
  return best;
}

function firstAfter<T>(items: Located<T>[], pos: number, maxDist = 300): T | undefined {
  for (const item of items) {
    if (item.pos > pos && item.pos - pos <= maxDist) return item.value;
  }
  return undefined;
}

// ─── IATA extraction helpers ──────────────────────────────────────────────────

function findIATAsBefore(text: string, pos: number, maxDist = 500): string[] {
  const window = text.slice(Math.max(0, pos - maxDist), pos);
  return [...window.matchAll(/\b([A-Z]{3})\b/g)]
    .map(m => m[1])
    .filter(isIATA);
}

function findIATAsAfter(text: string, pos: number, maxDist = 500): string[] {
  const window = text.slice(pos, pos + maxDist);
  return [...window.matchAll(/\b([A-Z]{3})\b/g)]
    .map(m => m[1])
    .filter(isIATA);
}

// ─── Airline detection ────────────────────────────────────────────────────────

const AIRLINE_NAME_MAP: [RegExp, Airline, string][] = [
  [/alaska airlines/i,    'alaska',   ''],
  [/hawaiian airlines/i,  'hawaiian', ''],
  [/american airlines/i,  'partner',  'American Airlines'],
  [/british airways/i,    'partner',  'British Airways'],
  [/delta air lines/i,    'partner',  'Delta Air Lines'],
  [/united airlines/i,    'partner',  'United Airlines'],
  [/japan airlines/i,     'partner',  'Japan Airlines'],
  [/\bqantas\b/i,         'partner',  'Qantas'],
  [/qatar airways/i,      'partner',  'Qatar Airways'],
  [/\bemirates\b/i,       'partner',  'Emirates'],
  [/cathay pacific/i,     'partner',  'Cathay Pacific'],
  [/air canada/i,         'partner',  'Air Canada'],
  [/\blufthansa\b/i,      'partner',  'Lufthansa'],
  [/air france/i,         'partner',  'Air France'],
  [/\bklm\b/i,            'partner',  'KLM'],
  [/air new zealand/i,    'partner',  'Air New Zealand'],
  [/singapore airlines/i, 'partner',  'Singapore Airlines'],
  [/\biberia\b/i,         'partner',  'Iberia'],
  [/\bfinnair\b/i,        'partner',  'Finnair'],
  [/turkish airlines/i,   'partner',  'Turkish Airlines'],
  [/\bana\b/i,            'partner',  'ANA'],
  [/asiana airlines/i,    'partner',  'Asiana Airlines'],
  [/korean air/i,         'partner',  'Korean Air'],
  [/\bjetblue\b/i,        'partner',  'JetBlue'],
  [/southwest airlines/i, 'partner',  'Southwest Airlines'],
  [/atmos/i,              'alaska',   ''],           // Atmos = Alaska program
];

function detectAirline(text: string): { airline: Airline; operatingCarrier: string } | undefined {
  for (const [re, airline, carrier] of AIRLINE_NAME_MAP) {
    if (re.test(text)) return { airline, operatingCarrier: carrier };
  }
  return undefined;
}

// ─── Global field extraction ──────────────────────────────────────────────────

interface GlobalFields {
  bookingReference?: string;
  ticketNumber?: string;
  airline?: Airline;
  operatingCarrier?: string;
  bookingChannel?: BookingChannel;
  bookedWithPoints?: boolean;
  pointsRedeemed?: number;
  ticketPrice?: number;
  memberNumber?: string;
  passengerName?: string;
}

function first(text: string, pattern: RegExp): string | undefined {
  return pattern.exec(text)?.[1]?.trim() || undefined;
}

function extractGlobal(text: string): GlobalFields {
  const g: GlobalFields = {};

  // Airline from body text or From: header
  const detected = detectAirline(text);
  if (detected) { g.airline = detected.airline; g.operatingCarrier = detected.operatingCarrier; }

  // Booking reference — many label formats
  g.bookingReference =
    first(text, /confirmation\s*code\s*:?\s*\n?\s*([A-Z0-9]{5,8})/i)
    // "Booking reference (PNR) - 8ZQRNF" style (QR, Etihad, etc.)
    ?? first(text, /(?:booking\s+reference|record\s+locator|PNR)\s*(?:\([^)]*\))?\s*[-:\s#]+([A-Z0-9]{5,8})/i)
    ?? first(text, /(?:booking\s*(?:ref(?:erence)?|code|number))\s*[:\s#]+([A-Z0-9]{5,8})/i)
    // "Confirmation : 8ZQRNF" or "Booking confirmation : CODE" in subject/title
    ?? first(text, /\bconfirmation\s*:\s*([A-Z0-9]{5,8})\b/i)
    ?? first(text, /(?:your\s+)?(?:itinerary|confirmation)\s+(?:number|code|#)\s*[:\s]*([A-Z0-9]{5,8})/i)
    ?? first(text, /receipt[:\s]+([A-Z0-9]{5,8})\s+for/i);

  // Ticket number — handle dashed format "157-2134384336" (QR) and plain 10-14 digit
  g.ticketNumber =
    first(text, /(?:e-?ticket|ticket\s*(?:number|no\.?)?)\s*[:\s#\n]*(\d{3}-\d{10,12})\b/i)
    ?? first(text, /(?:e-?ticket|ticket\s*(?:number|no\.?)?)\s*[:\s#(]*(\d{10,14})\b/i)
    ?? first(text, /\bTicket\s+(\d{10,14})\b/)
    ?? first(text, /\((\d{10,14})\)/);

  // Award / points — including Avios (QR/BA), miles, points
  const ptsMatch = /([\d,]+)\s+(?:miles?|points?|avios)\s+(?:have\s+been\s+)?(?:redeemed|used)/i.exec(text);
  if (ptsMatch) {
    g.bookedWithPoints = true;
    g.pointsRedeemed = parseInt(ptsMatch[1].replace(/,/g, ''), 10);
  }
  // "20750 Avios + 323.39 GBP" style totals (QR)
  if (!g.bookedWithPoints) {
    const aviosTotal = /([\d,]+)\s+Avios\b/i.exec(text);
    if (aviosTotal) {
      g.bookedWithPoints = true;
      g.pointsRedeemed = parseInt(aviosTotal[1].replace(/,/g, ''), 10);
    }
  }
  if (!g.bookedWithPoints && /\baward\s+(?:ticket|booking|flight)\b/i.test(text)) {
    g.bookedWithPoints = true;
  }

  // Ticket price
  if (!g.bookedWithPoints) {
    const price =
      first(text, /(?:total\s+(?:amount|fare|charge|cost)|per[- ]person\s+total)\s*[:\$]?\s*\$?\s*([\d,]+\.\d{2})/i)
      ?? first(text, /\$\s*([\d,]+\.\d{2})\s*(?:USD)?/);
    if (price) g.ticketPrice = parseFloat(price.replace(/,/g, ''));
  }

  // Booking channel
  if (/Partner Award Booking Fee/i.test(text) || /atmos\s*rewards/i.test(text)) {
    g.bookingChannel = 'atmos';
  } else if (g.airline === 'alaska' || g.airline === 'hawaiian') {
    g.bookingChannel = 'atmos';
  }

  // Member / frequent flyer number — includes QR "Membership number" (value on separate line)
  g.memberNumber =
    first(text, /Atmos[^#\n]*#\s*(\d+)/)
    ?? first(text, /(?:mileage\s*plan|frequent\s*flyer|skymiles|mileageplus|aadvantage|onepass|member(?:\s*no\.?|\s*#|\s*number)?)\s*[:\s#]+(\d{6,12})/i)
    // QR / airline loyalty: "Membership number" label with value on a later line
    ?? first(text, /Membership\s+number[\s\S]{0,300}?(\d{7,12})/i);

  // Passenger name — near "passenger", "traveler", "name:", "Mr/Mrs"
  const nameMatch =
    /(?:passenger|traveler|name)\s*:\s*([A-Z][a-z]+(?: [A-Z][a-z]+)+)/i.exec(text)
    ?? /(?:dear|hello)\s+([A-Z][a-z]+(?: [A-Z][a-z]+)+)/i.exec(text)
    ?? /\bMr?s?\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/.exec(text);
  if (nameMatch) g.passengerName = nameMatch[1];

  return g;
}

// ─── Segment extraction ───────────────────────────────────────────────────────

function extractSegments(text: string, global: GlobalFields): ParsedFlight[] {
  const allDates = findAllDates(text);
  const allTimes = findAllTimes(text);
  const segments: ParsedFlight[] = [];
  const seen = new Set<string>();

  // Reset carrier regex
  CARRIER_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = CARRIER_RE.exec(text)) !== null) {
    const carrierCode = match[1];
    const flightNum   = match[2];
    const flightPos   = match.index;

    const entry = CARRIER_CODE_MAP[carrierCode];
    if (!entry) continue;
    const [airline, operatingCarrier] = entry;

    const flightEnd = flightPos + match[0].length;

    // Find origin/destination using multiple strategies
    let origin: string | undefined;
    let destination: string | undefined;

    // Strategy 1: Explicit arrow route "LHR → PHL" in ±500 chars around the flight number
    const ARROW_RE = /\b([A-Z]{3})\s*(?:→|->|–|—)\s*([A-Z]{3})\b/;
    const arrowBefore = ARROW_RE.exec(text.slice(Math.max(0, flightPos - 500), flightPos));
    if (arrowBefore && isIATA(arrowBefore[1]) && isIATA(arrowBefore[2])) {
      origin = arrowBefore[1]; destination = arrowBefore[2];
    }
    if (!origin || !destination) {
      const arrowAfter = ARROW_RE.exec(text.slice(flightEnd, flightEnd + 500));
      if (arrowAfter && isIATA(arrowAfter[1]) && isIATA(arrowAfter[2])) {
        origin = arrowAfter[1]; destination = arrowAfter[2];
      }
    }

    // Strategy 2: Last IATA before the flight number (origin), first IATA after (destination)
    const iatasBefore = findIATAsBefore(text, flightPos, 500);
    const iatasAfter = findIATAsAfter(text, flightEnd, 500);

    if (!origin) origin = iatasBefore[iatasBefore.length - 1];
    if (!destination) destination = iatasAfter[0];

    // Strategy 3: Both airports appear BEFORE the flight number (QR, Emirates, many intl airlines)
    // Layout: "10:35 LHR ... 14:35 PHL ... AA 729" — departure then arrival then flight#
    if (!destination && iatasBefore.length >= 2) {
      origin      = iatasBefore[iatasBefore.length - 2];
      destination = iatasBefore[iatasBefore.length - 1];
    }

    // Strategy 4: Both airports appear AFTER the flight number
    if (!origin && iatasAfter.length >= 2) {
      origin      = iatasAfter[0];
      destination = iatasAfter[1];
    }

    if (!origin || !destination || origin === destination) continue;

    // Dedup: same flight+route (e.g. repeated in email header and itinerary)
    const key = `${flightNum}|${origin}|${destination}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // Date: nearest date to the flight number (before preferred, after as fallback)
    const date = lastBefore(allDates, flightPos) ?? firstAfter(allDates, flightPos, 600);

    // Times: find times near each airport
    // Departure time = time nearest to origin IATA position
    const originMatch = new RegExp(`\\b${origin}\\b`).exec(
      text.slice(Math.max(0, flightPos - 400), flightPos),
    );
    const originPos = originMatch
      ? Math.max(0, flightPos - 400) + originMatch.index!
      : flightPos - 400;

    const departureTime = firstAfter(allTimes, originPos, 200)
      ?? lastBefore(allTimes, flightPos);

    const destMatch = new RegExp(`\\b${destination}\\b`).exec(
      text.slice(flightEnd, flightEnd + 400),
    );
    const destPos = destMatch ? flightEnd + destMatch.index! : flightEnd;

    const arrivalTime = firstAfter(allTimes, destPos, 200);

    // Fare class: look in zone around this flight number
    const zone = text.slice(Math.max(0, flightPos - 100), flightEnd + 600);
    let fareClass: FareClass | undefined;

    // "Class: T (COACH)" Alaska style
    const akClass = /Class:\s+([A-Z])\s+\(([^)]+)\)/i.exec(zone);
    if (akClass) {
      fareClass = normalizeCabin(akClass[2], airline) ?? ALASKA_BOOKING_CLASS[akClass[1]];
    }
    // "Class:\nEconomy" AA style (after HTML strip)
    if (!fareClass) {
      const classBlock = /Class\s*:?\s*\n?\s*([A-Za-z][A-Za-z ]{2,25}?)(?:\s*\n|\s*\()/i.exec(zone);
      if (classBlock) fareClass = normalizeCabin(classBlock[1], airline);
    }
    // Cabin keyword inline
    if (!fareClass) {
      const cabinMatch = /\b(economy|business|first class|premium economy|main cabin|main|coach|saver|basic economy)\b/i.exec(zone);
      if (cabinMatch) fareClass = normalizeCabin(cabinMatch[1], airline);
    }
    // Booking class letter in parens: "(Q)", "(Y)", "(M)"
    if (!fareClass) {
      const bkClass = /\(\s*([A-Z])\s*\)/.exec(zone);
      if (bkClass) fareClass = ALASKA_BOOKING_CLASS[bkClass[1]];
    }

    segments.push({
      ...global,
      flightNumber: flightNum,
      origin,
      destination,
      date,
      departureTime: departureTime ?? undefined,
      arrivalTime: arrivalTime ?? undefined,
      airline: global.airline ?? airline,
      operatingCarrier: global.operatingCarrier ?? operatingCarrier,
      fareClass,
    });
  }

  return segments;
}

// ─── Route-only fallback ──────────────────────────────────────────────────────
// For emails with no parseable flight number (some regional carriers, travel agencies)

function routeFallback(text: string, global: GlobalFields): ParsedFlight | null {
  const allDates = findAllDates(text);

  // Try "XXX → YYY" or "XXX - YYY" or "From XXX to YYY"
  const route =
    /\b([A-Z]{3})\s*(?:→|->|–|-)\s*([A-Z]{3})\b/.exec(text)
    ?? /\bfrom\s+([A-Z]{3})\s+to\s+([A-Z]{3})\b/i.exec(text);

  if (!route) return null;
  const [, origin, destination] = route;
  if (!isIATA(origin) || !isIATA(destination)) return null;

  const date = lastBefore(allDates, route.index!);

  return { ...global, origin, destination, date };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function parseAllLegs(raw: string): ParsedFlight[] {
  const text = normalize(raw);
  const global = extractGlobal(text);

  // Primary: anchor on flight numbers
  const segments = extractSegments(text, global);
  if (segments.length > 0) return segments;

  // Fallback: route pattern (no flight number found)
  const single = routeFallback(text, global);
  if (single) return [single];

  // Last resort: return whatever global fields we found as a single empty-ish leg
  return [{ ...global }];
}

// Backward-compat wrapper: returns the first leg only.
export function parseConfirmationEmail(raw: string): ParsedFlight {
  return parseAllLegs(raw)[0] ?? {};
}
