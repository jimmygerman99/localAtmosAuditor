import { useState } from 'react';
import type { FlightEarned } from '../types';
import { ALASKA_FARE_LABELS, HAWAIIAN_FARE_LABELS, PARTNER_FARE_LABELS } from '../data/flights';
import type { AlaskaFareClass, PartnerFareClass } from '../types';
import { haversineDistance } from '../utils/haversine';
import AirportInput from './AirportInput';
import { AIRLINES_BY_CATEGORY } from '../data/airlines';
import {
  EMPTY_FORM, detectAirline, airlineName, formStateToFlight,
  resolveFareLetter,
} from './flightFormUtils';
import type { FormState } from './flightFormUtils';

interface Props {
  onAdd: (flight: FlightEarned) => void;
}

const ALASKA_FARE_CLASSES   = Object.keys(ALASKA_FARE_LABELS)   as AlaskaFareClass[];
const HAWAIIAN_FARE_CLASSES = Object.keys(HAWAIIAN_FARE_LABELS) as AlaskaFareClass[];
const PARTNER_FARE_CLASSES  = Object.keys(PARTNER_FARE_LABELS)  as PartnerFareClass[];

export function AddFlightForm({ onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState('');

  const carrierUpper = form.carrierCode.toUpperCase();
  const airline  = detectAirline(carrierUpper);
  const isAlaska   = airline === 'alaska';
  const isHawaiian = airline === 'hawaiian';
  const isPartner  = airline === 'partner';
  const isAward    = form.bookingType === 'points';

  const distance = form.origin && form.destination
    ? haversineDistance(form.origin, form.destination) : 0;

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm(f => {
      const next = { ...f, [field]: value };
      if (field === 'carrierCode') {
        const a = detectAirline((value as string).toUpperCase());
        next.fareClass = a === 'partner' ? 'economy' : 'main';
        next.bookingChannel = a === 'alaska' || a === 'hawaiian' ? 'atmos' : 'direct';
      }
      return next;
    });
  }

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    if (!form.carrierCode.trim())  { setError('Carrier code is required'); return; }
    if (!form.flightNumber.trim()) { setError('Flight number is required'); return; }
    if (!form.origin || form.origin.length !== 3)      { setError('Valid origin airport is required'); return; }
    if (!form.destination || form.destination.length !== 3) { setError('Valid destination airport is required'); return; }

    const today = new Date().toISOString().slice(0, 10);
    const stub: FlightEarned = {
      postingDate: form.flightDate || today,
      flightDate:  null,
      airlineName: airlineName(carrierUpper) || carrierUpper,
      airline,
      carrierCode: carrierUpper,
      flightNumber: '',
      origin: '', destination: '',
      fareClassLetter: resolveFareLetter(form, airline),
      isAwardTravel: false,
      bookingChannel: airline === 'alaska' || airline === 'hawaiian' ? 'atmos' : form.bookingChannel,
      actualMiles: 0, actualStatusPoints: 0,
    };
    onAdd(formStateToFlight(form, stub));
    setForm(EMPTY_FORM);
    setOpen(false);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full px-6 py-4 flex items-center justify-between text-left">
        <span className="text-sm font-semibold text-gray-700">+ Add Flight Manually</span>
        {open && <span className="text-xs text-gray-400">▲ collapse</span>}
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="border-t border-gray-100 px-6 pb-6 pt-4 space-y-4">
          <FlightFormFields
            form={form} set={set}
            isAlaska={isAlaska} isHawaiian={isHawaiian} isPartner={isPartner}
            isAward={isAward} distance={distance}
            alaskaClasses={ALASKA_FARE_CLASSES} hawaiianClasses={HAWAIIAN_FARE_CLASSES} partnerClasses={PARTNER_FARE_CLASSES}
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="submit"
              className="px-4 py-2 text-sm font-semibold bg-blue-950 text-white rounded-lg hover:bg-blue-900">
              Add Flight
            </button>
            <button type="button" onClick={() => { setForm(EMPTY_FORM); setError(''); setOpen(false); }}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Shared form fields used by both Add and Edit ───────────────────────────────

interface FieldsProps {
  form: FormState;
  set: <K extends keyof FormState>(field: K, value: FormState[K]) => void;
  isAlaska: boolean; isHawaiian: boolean; isPartner: boolean;
  isAward: boolean; distance: number;
  alaskaClasses: AlaskaFareClass[];
  hawaiianClasses: AlaskaFareClass[];
  partnerClasses: PartnerFareClass[];
  showChannelToggle?: boolean;
}

export function FlightFormFields({
  form, set, isAlaska, isHawaiian, isPartner, isAward, distance,
  alaskaClasses, hawaiianClasses, partnerClasses, showChannelToggle = true,
}: FieldsProps) {
  const isAtmos = form.bookingChannel === 'atmos';
  return (
    <>
      {/* Row 1: airline dropdown / flight# / Cash-Points toggle / distance */}
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex flex-col gap-1 flex-1 min-w-48">
          <span className="text-xs text-gray-500">Airline</span>
          <select
            value={form.carrierCode}
            onChange={e => set('carrierCode', e.target.value)}
            className={selectCls}
          >
            <option value="">Select airline…</option>
            {AIRLINES_BY_CATEGORY.map(group => (
              <optgroup key={group.label} label={group.label}>
                {group.airlines.map(a => (
                  <option key={a.iata} value={a.iata}>{a.name} ({a.iata})</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Flight #</span>
          <input value={form.flightNumber} onChange={e => set('flightNumber', e.target.value)}
            maxLength={4} placeholder="2331"
            className="w-24 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Booking type</span>
          <div className="flex rounded-full border border-gray-300 overflow-hidden text-xs font-medium">
            <button type="button" onClick={() => set('bookingType', 'cash')}
              className={`px-3 py-1.5 transition-colors ${!isAward ? 'bg-blue-950 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
              Cash
            </button>
            <button type="button" onClick={() => set('bookingType', 'points')}
              className={`px-3 py-1.5 transition-colors ${isAward ? 'bg-amber-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
              Points
            </button>
          </div>
        </div>
        {isPartner && showChannelToggle && (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">Booked via</span>
            <div className="flex rounded-full border border-gray-300 overflow-hidden text-xs font-medium">
              <button type="button" onClick={() => set('bookingChannel', 'atmos')}
                className={`px-3 py-1.5 transition-colors ${isAtmos ? 'bg-blue-950 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                Via Alaska.com
              </button>
              <button type="button" onClick={() => set('bookingChannel', 'direct')}
                className={`px-3 py-1.5 transition-colors ${!isAtmos ? 'bg-blue-950 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                Via Airline's Site
              </button>
            </div>
          </div>
        )}
        {distance > 0 && (
          <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2.5 py-1 mb-0.5">
            {distance.toLocaleString()} mi
          </span>
        )}
      </div>

      {/* Row 2: airports */}
      <div className="flex gap-3">
        <AirportInput label="Origin" value={form.origin} onChange={v => set('origin', v)} />
        <AirportInput label="Destination" value={form.destination} onChange={v => set('destination', v)} />
      </div>

      {/* Row 3: fare class */}
      <div className="flex flex-col gap-1 max-w-xs">
        <span className="text-xs text-gray-500">Fare Class</span>
        {isAlaska && (
          <select value={form.fareClass} onChange={e => set('fareClass', e.target.value)} className={selectCls}>
            {alaskaClasses.map(fc => <option key={fc} value={fc}>{ALASKA_FARE_LABELS[fc]}</option>)}
          </select>
        )}
        {isHawaiian && (
          <select value={form.fareClass} onChange={e => set('fareClass', e.target.value)} className={selectCls}>
            {hawaiianClasses.map(fc => <option key={fc} value={fc}>{HAWAIIAN_FARE_LABELS[fc]}</option>)}
          </select>
        )}
        {isPartner && (
          <select value={form.fareClass} onChange={e => set('fareClass', e.target.value)} className={selectCls}>
            {partnerClasses.map(fc => <option key={fc} value={fc}>{PARTNER_FARE_LABELS[fc]}</option>)}
          </select>
        )}
        {!form.carrierCode && (
          <input value={form.fareClassLetter} onChange={e => set('fareClassLetter', e.target.value)}
            maxLength={1} placeholder="K"
            className="w-20 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 uppercase" />
        )}
      </div>

      {/* Row 4: flight date + actuals */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Flight Date</span>
          <input type="date" value={form.flightDate} onChange={e => set('flightDate', e.target.value)} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Actual Miles <span className="text-gray-400">(optional)</span></span>
          <input type="number" min={0} value={form.actualMiles}
            onChange={e => set('actualMiles', e.target.value)}
            placeholder="0" className={inputCls} onWheel={e => e.currentTarget.blur()} />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Actual SP <span className="text-gray-400">(optional)</span></span>
          <input type="number" min={0} value={form.actualSP}
            onChange={e => set('actualSP', e.target.value)}
            placeholder="0" className={inputCls} onWheel={e => e.currentTarget.blur()} />
        </div>
      </div>
    </>
  );
}

const inputCls  = 'text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full';
const selectCls = 'text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full';
