'use client';

import React from 'react';

export interface ConfirmDialogProps {
  title?: string;
  message: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** When true, uses the destructive (red) confirm button styling. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title = 'Confirm change',
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    onClick={onCancel}
  >
    <div
      className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <div className="mt-2 text-sm text-gray-600">{message}</div>
      <div className="mt-5 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
            destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

export default ConfirmDialog;
