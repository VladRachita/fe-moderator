'use client';

import React from 'react';

export interface ToggleSwitchProps {
  enabled: boolean;
  loading?: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  enabled,
  loading = false,
  disabled = false,
  onToggle,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={enabled}
    disabled={disabled || loading}
    onClick={onToggle}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
      enabled ? 'bg-blue-600' : 'bg-gray-200'
    }`}
  >
    <span
      className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
        enabled ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
    {loading && (
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="size-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </span>
    )}
  </button>
);

export default ToggleSwitch;
