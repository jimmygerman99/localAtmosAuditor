# Atmos Rewards Local Auditor — CLAUDE.md

## Project Overview

This is a local Atmos Rewards points auditor. It parses a CSV exported from
https://www.alaskaair.com/atmosrewards/account/activity, calculates expected
points earned per flight across all partner airlines, and flags discrepancies
between what the user should have earned vs. what actually posted.

The end goal is to eventually auto-submit missing points claims to Atmos with
all required evidence pre-filled.

---

## Sister Project Reference

The **Atmos Rewards Calculator** lives at `../atmosRewardsCalculator`. It is a
React/TypeScript web app that already has verified, correct earning rate logic.
When in doubt about any earning rule, cross-reference:

- `src/data/flights.ts` — all fare class multipliers for Alaska, Hawaiian, and partner airlines
- `src/utils/calculateEarnings.ts` — earning calculation logic (distance/spend/segment methods)
- `src/utils/haversine.ts` — great-circle distance formula
- `src/data/airports.ts` — airport IATA code → lat/lng coordinate lookup

Use the haversine formula + airport coordinate lookup for all distance
calculations — do NOT use a hardcoded route table. The calculator's haversine
utility and airport dataset cover all routes automatically.

---

## How the User Imports Data

Two supported methods:

1. **CSV upload/paste** — user downloads their activity CSV from the Atmos
   account page at https://www.alaskaair.com/atmosrewards/account/activity,
   then either drags the file in, selects it via file picker, or pastes the
   raw CSV text directly into the app
2. **Manual entry** — user types in individual flights one by one to check
   a specific flight's expected earnings against what posted

The CSV columns are:
```
Date, Activity, Status, Points, Bonus Points, Total Points, Status Points
```

Important parsing notes:
- Some Activity fields wrap across multiple lines (award travel entries) —
  handle gracefully by joining continuation lines until the next valid date row
- The `Date` field is always MM/DD/YYYY format
- Pre-merger entries (before Aug 2025) used separate SPECIAL SERVICES rows for
  award flight status points — these are not standalone flights
- Post-merger (Atmos era, Jan 2026+) status points post inline on the same row

---

## Flight Row Detection & Parsing

A row is a **flight_earned** if the Activity field matches the pattern:
```
[Airline Name]  [ROUTE] [FLIGHTNUM] [FARECODE]
```
Examples:
- `American Airlines  CLE-DFW AA2331 K`
- `LATAM Airlines  SCL-BBA LA1151 G`
- `British Airways  LHR-JFK BA117 J`

Extract from the Activity string:
- **Airline** — everything before the double space
- **Route** — ORIGIN-DESTINATION (3-letter IATA codes)
- **Flight number** — carrier code + digits
- **Fare class** — single letter at the end

A row is a **flight_redeemed** if Activity contains a PNR/confirmation code
pattern and the name of the account holder:
```
American Airlines  AA CLE-LGA UAMDAG  James German
```

A row is a **flight_rollback** if Activity contains "Rollback".

---

## Flight Date Handling

The CSV Date field reflects the **transaction/posting date**, not the actual
flight date. These can differ by days or weeks.

When a discrepancy is detected or the user wants to file a claim, prompt:
> "What was the actual date you flew this flight? (The posting date in your
> CSV is [DATE] but the flight date may be different.)"

Store both dates — posting date from CSV, flight date from user input.

---

## Partner Airlines Supported

This auditor must handle **any airline** credited to an Atmos number, not just
Alaska and Hawaiian. Common partners include but are not limited to:

- American Airlines (AA)
- British Airways (BA)
- Qatar Airways (QR)
- Japan Airlines (JL)
- Cathay Pacific (CX)
- Finnair (AY)
- Iberia (IB)
- Aer Lingus (EI)
- LATAM Airlines (LA)
- Malaysia Airlines (MH)
- Qantas (QF)
- Royal Jordanian (RJ)
- SriLankan Airlines (UL)
- STARLUX Airlines (JX)
- Air Tahiti Nui (TN)
- WestJet (WS)
- Korean Air (KE)

For each airline, the fare class meaning differs. The earning rate is
determined by **cabin**, not fare class letter, since different airlines use
different fare class conventions. Use the cabin-to-rate mapping below.

---

## Earning Rate Logic

### Alaska Airlines flights (booked via Atmos / alaskaair.com)

500-point minimum applies: `Math.max(500, Math.round(distanceMiles * multiplier))`

| Fare Class Label           | Booking Class Letters | Multiplier |
|----------------------------|-----------------------|-----------|
| Saver / Basic Economy      | X                     | 30%       |
| Main Cabin                 | M, L, V, S, N, Q, O, G | 100%    |
| Main Cabin Flexible        | H, K                  | 125%      |
| Main Cabin Full Fare       | Y, B                  | 150%      |
| First Class Discount       | D, I                  | 150%      |
| First Class Flexible       | C                     | 175%      |
| First Class Full Fare      | J                     | 200%      |

### Hawaiian Airlines flights

500-point minimum applies: `Math.max(500, Math.round(distanceMiles * multiplier))`

| Fare Class Label           | Booking Class Letters | Multiplier |
|----------------------------|-----------------------|-----------|
| Saver                      | U                     | 30%       |
| Main Cabin                 | N, M, I, H, G, K, L, Z, O | 100% |
| Main Flexible              | Q, V, B, S            | 125%      |
| Main Full                  | Y, W                  | 150%      |
| First Discount             | C, A, D               | 150%      |
| First Flexible             | P                     | 175%      |
| First Full                 | F, J                  | 200%      |

### Partner airline flights — booked via Atmos / alaskaair.com

**No 500-point minimum for partner flights.**
Formula: `Math.round(distanceMiles * multiplier)`

| Cabin                      | Multiplier |
|----------------------------|-----------|
| Economy (discount/basic)   | 100%      |
| Economy (full)             | 100%      |
| Premium Economy            | 150%      |
| Business (international)   | 250%      |
| First (domestic)           | 150%      |
| First (international)      | 350%      |

### Partner airline flights — booked directly on partner's site

**No 500-point minimum for partner flights.**
Formula: `Math.round(distanceMiles * multiplier)`

| Cabin                      | Multiplier |
|----------------------------|-----------|
| Economy (discount/basic)   | 25%       |
| Economy (full)             | 50%       |
| Premium Economy            | 100%      |
| Business (international)   | 125%      |
| First (domestic)           | 150%      |
| First (international)      | 150%      |

**Booking channel detection:** If the CSV row came from a booking made through
alaskaair.com (e.g. Atmos portal, confirmed by "Partner Award Booking Fee" in
the same statement period), use the Atmos rates. Otherwise default to the
partner-direct rates. When uncertain, prompt the user.

---

## Status Points

Status points are earned at the same rate as base miles **before** any elite
bonus is applied.

```
statusPoints = Math.round(distanceMiles * multiplier)   // same as baseMiles
miles        = Math.round(baseMiles * (1 + eliteBonus))
```

The CSV's `Status Points` column is the ground truth for status points.
Compare it against the calculated `statusPoints` value (not `miles`).

---

## Elite Tier Bonuses

Elite bonuses increase redeemable miles **only** — they do NOT increase status
points. Ask the user for their elite tier when the tool starts.

| Tier      | Bonus |
|-----------|-------|
| None      | +0%   |
| Silver    | +25%  |
| Gold      | +50%  |
| Platinum  | +100% |
| Titanium  | +150% |

Example: Platinum member flies 1,000 base miles → earns 2,000 redeemable
miles but only 1,000 status points.

---

## Choice Earn (2026 earning method)

Members choose one earning method per year. Ask the user which they selected:

- **Distance** — default, % of miles flown per the charts above
- **Spend** — 5 points per $1 spent on the ticket (cash fares only)
  - Award tickets: 0 redeemable miles + 1 status point per 20 miles redeemed
  - Partner booked direct still falls back to distance calc
- **Segment** — flat 500 points per segment flown, any cabin
  - Partner booked direct still falls back to distance calc

---

## Fare Class → Cabin Mapping

### American Airlines (AA)

```js
const aaCabinMap = {
  // First
  F: 'first', A: 'first',
  // Business
  J: 'business', C: 'business', D: 'business',
  R: 'business', I: 'business', Z: 'business',
  // Premium Economy
  W: 'premium_economy', P: 'premium_economy',
  // Economy (full)
  Y: 'economy', H: 'economy', K: 'economy',
  M: 'economy', L: 'economy', V: 'economy',
  S: 'economy', N: 'economy', Q: 'economy',
  O: 'economy', G: 'economy',
  // Economy (discount/basic)
  B: 'economy_discount', E: 'economy_discount',
  // Award travel — 0 redeemable miles, status points via redemption formula
  T: 'award',
};
```

### British Airways (BA)

```js
const baCabinMap = {
  // First (Club World = business on longhaul)
  F: 'first', A: 'first',
  // Business (Club World)
  J: 'business', C: 'business', D: 'business', R: 'business',
  // Premium Economy (World Traveller Plus)
  W: 'premium_economy',
  // Economy (World Traveller full)
  Y: 'economy', B: 'economy', H: 'economy', K: 'economy',
  M: 'economy', L: 'economy', V: 'economy', S: 'economy', N: 'economy',
  // Economy (discount/sale)
  Q: 'economy_discount', O: 'economy_discount', G: 'economy_discount',
  // Award
  T: 'award', U: 'award', X: 'award',
};
```

For all other partner airlines where fare class → cabin mapping is unknown:
prompt the user:
> "What cabin did you fly on this [AIRLINE] flight ([ROUTE])?
> (Economy / Premium Economy / Business / First)"

---

## Distance Calculation

Use the **Haversine formula** with airport IATA code → lat/lng coordinates.
Reference the sister project's `src/utils/haversine.ts` and
`src/data/airports.ts` for the implementation and coordinate dataset.

Do NOT maintain a hardcoded route distance table — the haversine approach
covers all routes automatically and is already verified correct.

If an airport code is not found in the coordinate dataset:
1. Prompt the user: "We don't have coordinates for airport [CODE]. What city/airport is this?"
2. Cache the user-provided distance for the session

---

## Discrepancy Display

For each flight_earned row, display:

- ✅ **Green** — actual points >= expected points (within 10% tolerance)
- ⚠️ **Red** — actual points < expected points (missing points detected)

```
[DATE] [AIRLINE] [ROUTE] [FLIGHT#] [FARE CLASS / CABIN]
  Expected miles: X  |  Actual miles: Y  |  Diff: Z  ✅/⚠️
  Expected SP:    X  |  Actual SP:    Y  |  Diff: Z  ✅/⚠️
```

---

## Missing Points Claim (Future Feature — Phase 3)

When the user flags a discrepancy and wants to file a claim, collect:

- Airline
- Flight number
- Flight date (ask user — not the posting date)
- Route (origin + destination)
- Fare class / cabin
- Ticket/confirmation number (PNR from the redeemed row or user input)
- Atmos Rewards number (ask once, store for session)

The Atmos missing points form is at:
https://www.alaskaair.com/atmosrewards/account/missing-miles

Eventually auto-fill and submit this form with the collected data using
a headless browser (Playwright). Flag this as a future automation task —
do not attempt to implement until the parsing and discrepancy detection
are solid.

---

## Row Categories Summary

| Category | Detection | Action |
|----------|-----------|--------|
| `flight_earned` | Airline + ROUTE + FLIGHTNUM + FARECODE pattern | Parse, calculate expected, compare |
| `flight_redeemed` | Contains PNR + member name | Log redemption, deduct from balance |
| `flight_rollback` | Contains "Rollback" | Cancel matching redemption |
| `credit_card` | Contains "BARCLAYS" | Log status points (1 per $3 spent) |
| `dining` | Contains "ATMOS REWARDS DINING" | Log redeemable + status points |
| `transfer` | Contains "POINTS.COM" | Log transfer in |
| `special_services` | Contains "SPECIAL SERVICES" | Log manually, flag pre-merger award SPs |
| `unknown` | Anything else | Flag for review |

---

## Tech Stack

- **Runtime:** Node.js (no npm dependencies for core parsing)
- **UI:** Terminal output for now, HTML report output as stretch goal
- **File input:** `fs.readFileSync` for CSV, readline for interactive prompts
- **Future:** Playwright for form automation

---

## Key Constraints

- Never send user data to any third party server — all processing is local
- Do not require login credentials — CSV export only
- The Barclays card posts status points as a separate line item monthly,
  not per transaction — do not try to reverse-calculate individual purchases
- Pre-merger SPECIAL SERVICES award flight status credits are not flights —
  do not treat them as flight_earned rows
- Elite bonuses affect redeemable miles only, never status points
- The 500-point minimum applies to Alaska and Hawaiian flights only —
  partner airline flights have no minimum
