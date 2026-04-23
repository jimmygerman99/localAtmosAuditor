import type { RawRow, RowType, FlightEarned, FlightRedeemed, Airline } from '../types';
import { MIN_EARNED_POSTING_DATE } from '../types';

// ── Regex patterns ────────────────────────────────────────────────────────────
//
// EARNED activity format:   "ORIGIN-DEST CARRIERFLIGHT# FARECODE"
//   e.g.  "CLE-DFW AA2331 K"
//         "SCL-BBA LA1151 G"
//
// REDEEMED activity format: "CARRIER ORIGIN-DEST CONFIRMCODE"
//   e.g.  "AA CLE-LGA UAMDAG"
//
// Both patterns appear AFTER the double-space that separates the airline name
// from the rest of the activity field.

const EARNED_RE   = /^([A-Z]{3})-([A-Z]{3})\s+([A-Z]{1,2})(\d{1,4})\s+([A-Z])$/;
const REDEEMED_RE = /^([A-Z]{1,2})\s+([A-Z]{3})-([A-Z]{3})\s+([A-Z0-9]{5,8})$/;

// Any data row starts with MM/DD/YYYY — used to spot continuation lines
const DATE_START_RE = /^\d{2}\/\d{2}\/\d{4},/;

// ── Airline name → Airline type ───────────────────────────────────────────────
//
// We only need to know whether a flight earns at Alaska/Hawaiian rates or
// partner rates. The raw airline name is preserved on the parsed row.

const AIRLINE_MAP: [RegExp, Airline][] = [
  [/alaska airlines/i,   'alaska'],
  [/hawaiian airlines/i, 'hawaiian'],
  [/american airlines/i, 'partner'],
  [/british airways/i,   'partner'],
  [/japan airlines/i,    'partner'],
  [/cathay pacific/i,    'partner'],
  [/\bfinnair\b/i,       'partner'],
  [/\biberia\b/i,        'partner'],
  [/aer lingus/i,        'partner'],
  [/\blatam\b/i,         'partner'],
  [/malaysia airlines/i, 'partner'],
  [/\bqantas\b/i,        'partner'],
  [/royal jordanian/i,   'partner'],
  [/srilankan/i,         'partner'],
  [/\bstarlux\b/i,       'partner'],
  [/air tahiti nui/i,    'partner'],
  [/\bwestjet\b/i,       'partner'],
  [/korean air/i,        'partner'],
  [/qatar airways/i,     'partner'],
  [/united airlines/i,   'partner'],
  [/delta air lines/i,   'partner'],
];

function detectAirline(name: string): Airline {
  for (const [re, airline] of AIRLINE_MAP) {
    if (re.test(name)) return airline;
  }
  return 'partner'; // unknown airlines default to partner rates
}

// ── CSV utilities ─────────────────────────────────────────────────────────────

// Converts MM/DD/YYYY → YYYY-MM-DD for consistent string comparison
function parseDate(raw: string): string {
  const [mm, dd, yyyy] = raw.trim().split('/');
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

// Handles quoted fields and escaped quotes ("") correctly
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

// ── Row type detection ────────────────────────────────────────────────────────
//
// Order matters: rollback check must come before redeemed, because rollback
// rows have Status=Redeposited but the activity still contains airline info.

function detectRowType(activity: string, status: string): RowType {
  if (/BARCLAYS/i.test(activity))             return 'credit_card';
  if (/ATMOS REWARDS DINING/i.test(activity)) return 'dining';
  if (/POINTS\.COM/i.test(activity))          return 'transfer';
  if (/SPECIAL SERVICES/i.test(activity))     return 'special_services';
  if (/Rollback/i.test(activity))             return 'flight_rollback';
  if (status === 'Redeemed')                  return 'flight_redeemed';
  // A credited row is a flight only if it has the double-space separator
  if (status === 'Credited' && activity.includes('  ')) return 'flight_earned';
  return 'unknown';
}

// ── Public result type ────────────────────────────────────────────────────────

export interface CsvParseResult {
  earned:   FlightEarned[];
  redeemed: FlightRedeemed[];
  skipped:  number;   // pre-2026 earned rows + non-flight rows (dining, card, etc.)
  unknown:  RawRow[]; // rows that matched no known pattern — useful for debugging
}

// ── Main parser ───────────────────────────────────────────────────────────────

export function parseCsvActivity(csvText: string): CsvParseResult {
  // ── Step 1: Rejoin continuation lines ──────────────────────────────────────
  //
  // Some activity fields in the CSV contain a literal newline. Example:
  //   "American Airlines  JFK-CLE AA4709 T\nAWARD TRAVEL - STATUS POINTS ONLY"
  //
  // These continuation lines don't start with a date, so we detect them and
  // append them back to the previous line before splitting into columns.

  const rawLines = csvText.replace(/\r/g, '').split('\n');
  const lines: string[] = [];
  for (const raw of rawLines) {
    if (!raw.trim()) continue;
    if (DATE_START_RE.test(raw) || lines.length === 0) {
      lines.push(raw);
    } else {
      lines[lines.length - 1] += '\n' + raw;
    }
  }

  const result: CsvParseResult = { earned: [], redeemed: [], skipped: 0, unknown: [] };
  if (lines.length < 2) return result; // nothing but a header row

  // ── Step 2: Parse each data row (skip header at index 0) ───────────────────

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < 7) continue;

    const [rawDate, rawActivity, rawStatus, rawPoints, rawBonus, rawTotal, rawSP] = cols;

    const postingDate = parseDate(rawDate);
    const status      = rawStatus.trim();

    // The first line of the activity field is the structured data.
    // Any subsequent lines (e.g. "AWARD TRAVEL - STATUS POINTS ONLY") are notes.
    const activity     = rawActivity.split('\n')[0].trim();
    const isAwardTravel = rawActivity.includes('AWARD TRAVEL');

    const type = detectRowType(activity, status);

    const rawRow: RawRow = {
      postingDate,
      activity,
      status,
      points:       parseInt(rawPoints.trim(), 10) || 0,
      bonusPoints:  parseInt(rawBonus.trim(), 10)  || 0,
      totalPoints:  parseInt(rawTotal.trim(), 10)  || 0,
      statusPoints: parseInt(rawSP.trim(), 10)     || 0,
      type,
    };

    // ── Step 3: Route each row to the correct output bucket ──────────────────

    if (type === 'flight_earned') {
      // Filter out pre-merger earned flights — earning rules changed at merger
      if (postingDate < MIN_EARNED_POSTING_DATE) { result.skipped++; continue; }

      // Split "Airline Name  ORIGIN-DEST CARRIER#### FARE" at the double-space
      const dbl = activity.indexOf('  ');
      if (dbl === -1) { result.unknown.push(rawRow); continue; }

      const airlineName = activity.slice(0, dbl).trim();
      const rest        = activity.slice(dbl + 2).split('\n')[0].trim();

      const m = EARNED_RE.exec(rest);
      if (!m) { result.unknown.push(rawRow); continue; }

      const [, origin, destination, carrierCode, flightNumber, fareClassLetter] = m;

      result.earned.push({
        postingDate,
        flightDate:         null,
        airlineName,
        airline:            detectAirline(airlineName),
        carrierCode,
        flightNumber,
        origin,
        destination,
        fareClassLetter,
        isAwardTravel,
        actualMiles:        rawRow.points,
        actualStatusPoints: rawRow.statusPoints,
      });
    }

    else if (type === 'flight_redeemed') {
      // Split "Airline Name  CARRIER ORIGIN-DEST CONFIRMCODE  PASSENGER NAME"
      const dbl = activity.indexOf('  ');
      if (dbl === -1) { result.unknown.push(rawRow); continue; }

      const airlineName  = activity.slice(0, dbl).trim();
      const afterAirline = activity.slice(dbl + 2);

      // Passenger name (if present) is separated by a second double-space
      const dbl2         = afterAirline.indexOf('  ');
      const rest         = (dbl2 !== -1 ? afterAirline.slice(0, dbl2) : afterAirline).trim();
      const passengerName = dbl2 !== -1 ? afterAirline.slice(dbl2 + 2).trim() : '';

      const m = REDEEMED_RE.exec(rest);
      if (!m) { result.unknown.push(rawRow); continue; }

      const [, carrierCode, origin, destination, confirmationCode] = m;

      result.redeemed.push({
        postingDate,
        airlineName,
        airline:          detectAirline(airlineName),
        carrierCode,
        origin,
        destination,
        confirmationCode,
        passengerName,
        pointsRedeemed:   Math.abs(rawRow.points), // CSV stores as negative
      });
    }

    else if (type === 'unknown') {
      result.unknown.push(rawRow);
    }

    else {
      // credit_card, dining, transfer, special_services, flight_rollback
      result.skipped++;
    }
  }

  return result;
}
