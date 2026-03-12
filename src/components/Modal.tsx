import React from 'react';

type ModalProps = {
  isOpen: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  submitLabel?: string;
  errorMessage?: string | null;
  isSubmitting?: boolean;
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  children,
  onClose,
  onSubmit,
  submitLabel = 'Save',
  errorMessage,
  isSubmitting = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200">
        <form onSubmit={onSubmit}>
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-virtus-navy">{title}</h3>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm font-bold" disabled={isSubmitting}>Close</button>
          </div>
          <div className="p-6 space-y-4">
            {errorMessage ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMessage}
              </div>
            ) : null}
            {children}
          </div>
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50" disabled={isSubmitting}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : submitLabel}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
