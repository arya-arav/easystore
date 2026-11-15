'use client';

// Customer account building blocks: a page heading, white rounded cards for each
// section, and profile fields edited in place. Colours use the theme (primary-*).

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export function AccountHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold leading-9 text-text-primary">{title}</h1>
        {description && <p className="mt-1 max-w-xl text-sm text-text-secondary">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function AccountSection({ title, description, actions, children, className }: { title?: string; description?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cx('mb-5 rounded-2xl bg-white p-5 shadow-sm sm:p-6', className)}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            {title && <h2 className="text-base font-semibold text-text-primary">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-text-secondary">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export const accountButton = (variant: 'primary' | 'secondary' | 'ghost' = 'secondary', className?: string) =>
  cx(
    'inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50',
    variant === 'primary' && 'bg-primary-500 text-white shadow-sm hover:bg-primary-600',
    variant === 'secondary' && 'border border-gray-200 bg-white text-text-primary hover:border-primary-300 hover:text-primary-600',
    variant === 'ghost' && 'text-primary-500 hover:bg-primary-50',
    className
  );

export const accountInput = 'h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-primary-400 focus:ring-2 focus:ring-primary-100';

/**
 * One profile field: shows the current value with an Edit button; editing opens the
 * form in place (Medusa's account profile). `onSave` resolves to an error message or null.
 */
export function EditableRow({ label, value, children, onSave, disabled, hint }: {
  label: string;
  value: React.ReactNode;
  children: React.ReactNode;
  onSave: () => Promise<string | null>;
  disabled?: boolean;
  hint?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const problem = await onSave();
    setSaving(false);
    if (problem) setError(problem);
    else { setOpen(false); setSaved(true); setTimeout(() => setSaved(false), 3000); }
  };

  return (
    <div className="border-t border-gray-100 py-4 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
          <div className="mt-1 break-words text-sm text-text-primary">{value}</div>
          {saved && <p className="mt-1 text-xs text-primary-600">Saved</p>}
        </div>
        {!disabled && (
          <button type="button" onClick={() => { setOpen((o) => !o); setError(''); }} className={accountButton('ghost', 'h-8 px-3')}>
            {open ? 'Cancel' : 'Edit'}
          </button>
        )}
      </div>
      {hint && !open && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
      {open && (
        <form onSubmit={submit} className="mt-4 space-y-3">
          {children}
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={saving} className={accountButton('primary')}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
          </button>
        </form>
      )}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tone: Record<string, string> = {
    PENDING: 'bg-amber-50 text-amber-700', CONFIRMED: 'bg-blue-50 text-blue-700', PROCESSING: 'bg-violet-50 text-violet-700',
    SHIPPED: 'bg-sky-50 text-sky-700', OUT_FOR_DELIVERY: 'bg-sky-50 text-sky-700', DELIVERED: 'bg-emerald-50 text-emerald-700',
    CANCELLED: 'bg-red-50 text-red-700', RETURNED: 'bg-gray-100 text-gray-600', REFUNDED: 'bg-gray-100 text-gray-600',
  };
  const label = status.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
  return <span className={cx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', tone[status] || 'bg-gray-100 text-gray-600')}>{label}</span>;
}
