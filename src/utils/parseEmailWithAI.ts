import Anthropic from '@anthropic-ai/sdk';
import type { FareClass, Airline, BookingChannel } from '../types';
import type { ParsedFlight } from './parseConfirmationEmail';

export type ParseInput =
  | { type: 'text'; content: string }
  | { type: 'pdf';  base64: string; name: string };

const SYSTEM_PROMPT = `You are a flight booking confirmation parser. Extract ALL flight segments from any airline's confirmation email, booking receipt, or itinerary — regardless of format, airline, or language.

Return ONLY a valid JSON array, one object per flight segment. No explanation, no markdown fences.

Schema per segment (null for any field not found):
{
  "bookingReference": string | null,
  "flightNumber": string | null,
  "origin": string | null,
  "destination": string | null,
  "date": string | null,
  "ticketNumber": string | null,
  "airline": "alaska" | "hawaiian" | "partner",
  "operatingCarrier": string | null,
  "fareClass": "saver"|"main"|"main_flexible"|"main_full"|"first_discount"|"first_flexible"|"first_full"|"economy_discount"|"economy"|"premium_economy"|"business"|"domestic_first"|"first" | null,
  "bookedWithPoints": boolean,
  "pointsRedeemed": number | null,
  "ticketPrice": number | null,
  "bookingChannel": "atmos" | "partner" | null,
  "memberNumber": string | null
}

Rules:
- ALWAYS return an array, even for a single segment: [{ ... }]
- "origin" / "destination": 3-letter IATA airport codes only (e.g. "SEA", "JFK", "LHR")
- "date": YYYY-MM-DD for the departure date of that specific segment
- "airline": "alaska" for Alaska Airlines, "hawaiian" for Hawaiian Airlines, "partner" for every other airline
- "operatingCarrier": full airline name when airline is "partner" (e.g. "American Airlines", "British Airways")
- "flightNumber": digits only, strip the airline prefix (e.g. "2336" not "AA2336")
- "fareClass" mapping:
    Alaska/Hawaiian — Saver/Basic→"saver", Main/Coach→"main", Main Flexible→"main_flexible", Main Full→"main_full", First Discount→"first_discount", First Flexible→"first_flexible", First Full→"first_full"
    All other airlines — Discount/Basic/Light/Saver→"economy_discount", Coach/Economy→"economy", Premium Economy→"premium_economy", Business→"business", Domestic First→"domestic_first", International First/First→"first"
- "bookedWithPoints": true only for award/miles/points redemption tickets
- "ticketPrice": per-person total cash amount in USD (null for award tickets)
- "bookingChannel": "atmos" if booked via Atmos Rewards portal or email mentions "Atmos"; otherwise "partner"
- Repeat shared fields (bookingReference, airline, memberNumber, bookingChannel) on every segment
- For connecting itineraries each segment is a separate object (e.g. CLE→DFW and DFW→ABI are two objects)
- For round trips include both outbound and return segments`;

function nullToUndef<T>(v: T | null | undefined): T | undefined {
  return v === null ? undefined : v;
}

function rawToFlight(raw: Record<string, unknown>): ParsedFlight {
  return {
    bookingReference: nullToUndef(raw.bookingReference as string | null),
    flightNumber:     nullToUndef(raw.flightNumber     as string | null),
    origin:           nullToUndef(raw.origin           as string | null),
    destination:      nullToUndef(raw.destination      as string | null),
    date:             nullToUndef(raw.date             as string | null),
    ticketNumber:     nullToUndef(raw.ticketNumber     as string | null),
    airline:          nullToUndef(raw.airline          as Airline | null),
    operatingCarrier: nullToUndef(raw.operatingCarrier as string | null),
    fareClass:        nullToUndef(raw.fareClass        as FareClass | null),
    bookedWithPoints: (raw.bookedWithPoints as boolean) ?? false,
    pointsRedeemed:   nullToUndef(raw.pointsRedeemed  as number | null),
    ticketPrice:      nullToUndef(raw.ticketPrice      as number | null),
    bookingChannel:   nullToUndef(raw.bookingChannel   as BookingChannel | null),
    memberNumber:     nullToUndef(raw.memberNumber     as string | null),
  };
}

export async function parseWithAI(
  input: ParseInput,
  apiKey: string,
): Promise<ParsedFlight[]> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  let userContent: Anthropic.MessageParam['content'];

  if (input.type === 'pdf') {
    userContent = [
      {
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: input.base64,
        },
      } as unknown as Anthropic.TextBlockParam,
      {
        type: 'text',
        text: 'Extract all flight segments from this booking confirmation.',
      },
    ];
  } else {
    userContent = `Extract all flight segments from this confirmation:\n\n${input.content.slice(0, 14000)}`;
  }

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
  const jsonMatch = /\[[\s\S]*\]/.exec(text);
  if (!jsonMatch) throw new Error('AI did not return a JSON array — check your API key and try again');

  const parsed = JSON.parse(jsonMatch[0]) as unknown;
  if (!Array.isArray(parsed)) throw new Error('Unexpected AI response format');

  return (parsed as Record<string, unknown>[]).map(rawToFlight);
}
