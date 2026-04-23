import { useState } from 'react';
import type { FlightEarned, AlaskaFareClass, PartnerFareClass } from '../types';
import { ALASKA_FARE_LABELS, HAWAIIAN_FARE_LABELS, PARTNER_FARE_LABELS } from '../data/flights';
import { haversineDistance } from '../utils/haversine';
import { detectAirline, flightToFormState, formStateToFlight } from './flightFormUtils';
import type { FormState } from './flightFormUtils';
import { FlightFormFields } from './AddFlightForm';

const ALASKA_FARE_CLASSES   = Object.keys(ALASKA_FARE_LABELS)   as AlaskaFareClass[];
const HAWAIIAN_FARE_CLASSES = Object.keys(HAWAIIAN_FARE_LABELS) as AlaskaFareClass[];
const PARTNER_FARE_CLASSES  = Object.keys(PARTNER_FARE_LABELS)  as PartnerFareClass[];

interface Props {
  flight:   FlightEarned;
  onSave:   (updated: FlightEarned) => void;
  onCancel: () => void;
}

export function EditFlightPanel({ flight, onSave, onCancel }: Props) {
  const [form, setForm] = useState<FormState>(() => flightToFormState(flight));
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
    if (!form.origin || form.origin.length !== 3)           { setError('Valid origin airport is required'); return; }
    if (!form.destination || form.destination.length !== 3) { setError('Valid destination airport is required'); return; }
    onSave(formStateToFlight(form, flight));
  }

  return (
    <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-4">
      <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-3">Edit Flight</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FlightFormFields
          form={form} set={set}
          isAlaska={isAlaska} isHawaiian={isHawaiian} isPartner={isPartner}
          isAward={isAward} distance={distance}
          alaskaClasses={ALASKA_FARE_CLASSES}
          hawaiianClasses={HAWAIIAN_FARE_CLASSES}
          partnerClasses={PARTNER_FARE_CLASSES}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-3 pt-1">
          <button type="submit"
            className="px-4 py-2 text-sm font-semibold bg-blue-950 text-white rounded-lg hover:bg-blue-900">
            Save Changes
          </button>
          <button type="button" onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
