import { useState } from 'react';
import type { UserProfile } from '../types';
import { ELITE_LABELS } from '../data/flights';

const EARNING_METHOD_LABELS: Record<string, string> = {
  distance: 'Distance (1 pt/mile)',
  spend: 'Spend (5 pts/$1)',
  segment: 'Segment (500 pts/flight)',
};

interface Props {
  profile: UserProfile;
  onChange: (p: UserProfile) => void;
}

export function UserSettings({ profile, onChange }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-xl mb-6">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div>
          <span className="font-semibold text-gray-900">Your Profile</span>
          {!open && (profile.memberNumber || profile.firstName) && (
            <span className="text-gray-400 text-sm ml-3">
              {profile.firstName && `${profile.firstName} ${profile.lastName}`.trim()}
              {profile.memberNumber && ` · MP# ${profile.memberNumber}`}
            </span>
          )}
        </div>
        <span className="text-gray-400 text-sm">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-5 pb-5 pt-4 grid grid-cols-2 gap-4 border-t border-gray-100">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">First Name</span>
            <input
              type="text"
              value={profile.firstName}
              onChange={e => onChange({ ...profile, firstName: e.target.value })}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Last Name</span>
            <input
              type="text"
              value={profile.lastName}
              onChange={e => onChange({ ...profile, lastName: e.target.value })}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Mileage Plan #</span>
            <input
              type="text"
              value={profile.memberNumber}
              onChange={e => onChange({ ...profile, memberNumber: e.target.value })}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Elite Status</span>
            <select
              value={profile.eliteStatus}
              onChange={e => onChange({ ...profile, eliteStatus: e.target.value as UserProfile['eliteStatus'] })}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {Object.entries(ELITE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
          <div className="col-span-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Earning Method (2026)</span>
              <select
                value={profile.earningMethod}
                onChange={e => onChange({ ...profile, earningMethod: e.target.value as UserProfile['earningMethod'] })}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {Object.entries(EARNING_METHOD_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="col-span-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Anthropic API Key</span>
              <p className="text-xs text-gray-400 mt-0.5 mb-1">
                Enables AI-powered parsing for any airline's confirmation email. Stored locally, never sent to a server.
                Get a key at <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">console.anthropic.com</a>.
              </p>
              <input
                type="password"
                value={profile.anthropicApiKey ?? ''}
                onChange={e => onChange({ ...profile, anthropicApiKey: e.target.value || undefined })}
                placeholder="sk-ant-…"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
