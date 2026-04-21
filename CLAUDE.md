v# Atmos Miles Audit — Project Context

## What this is
A local web app (React + TypeScript + Vite + Tailwind CSS) for auditing Alaska/Atmos miles earnings. Users log upcoming flights before they fly, then record what actually posted to their account afterward. The app highlights discrepancies and helps pre-fill Alaska's missing miles claim form.

## Sister project
The **Atmos Rewards Calculator** lives at `../atmosRewardsCalculator`. It calculates expected miles for flights, credit card spend, and partner purchases. This audit tool shares the same earning logic — when importing earning calculation utilities, consider pulling from the calculator or duplicating only what's needed.

## Earning rules (Atmos program — 2026)
- **Alaska/Hawaiian flights**: fare class multiplier × distance (500 pt minimum before multiplier)
- **Partner flights**: fare class multiplier × distance, no minimum. Booked via Atmos portal vs. direct on partner site affects the multiplier.
- **Elite tiers**: none / silver / gold / platinum / titanium — each adds a bonus % on top of base miles
- **Earning methods** (member picks one per year): distance / spend (5 pts/$1) / segment (flat per segment)
- **Award flights**: 0 redeemable miles; 1 status point per 20 points redeemed (spend method)

## Planned feature set
1. **Flight log** — add upcoming flights with: airline, flight #, origin, destination, fare class, booking channel, ticket price, booking reference, date
2. **Expected earnings** — calculated automatically from the flight details (same logic as the calculator)
3. **Actual earnings** — user enters what Alaska posted (miles + status points) after the flight
4. **Audit view** — expected vs. actual side-by-side, discrepancy flagged in red
5. **Missing miles helper** — pre-fills Alaska's missing miles claim form with all required info

## Tech stack
- React 19 + TypeScript
- Vite 8
- Tailwind CSS v4 (via `@tailwindcss/vite` plugin — no `tailwind.config.js` needed)
- Data persistence: localStorage (to start), Supabase when multi-device sync is needed

## Key conventions (match the calculator)
- Tailwind utility classes only — no CSS modules or styled-components
- `useLocalStorage` hook for all persisted state (bump `STORAGE_VERSION` when shape changes)
- Types in `src/types/index.ts`
- No comments unless the WHY is non-obvious
- No unnecessary abstractions — keep it simple until complexity is earned

## Running locally
```bash
npm run dev   # starts at http://localhost:5173
npx tsc --noEmit  # type check
```
