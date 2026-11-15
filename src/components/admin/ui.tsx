'use client';

// Admin building blocks, sized like the Medusa dashboard: 13px text, 32px controls,
// 8px cards with a ring shadow, section headers at 24px x 16px. Colours come from the
// `ui-*` tokens (.admin-ui in globals.css), so dark mode needs no extra classes.

import Link from 'next/link';
import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
export { cx };

/* ── Layout ─────────────────────────────────────────────────── */

export function Container({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx('rounded-lg bg-ui-base shadow-ui-card divide-y divide-ui-border', className)} {...rest}>
      {children}
    </div>
  );
}

/** Card header: title (+ subtitle) on the left, actions on the right. */
export function SectionHeader({ title, subtitle, actions, level = 2 }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; level?: 1 | 2 }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-4">
      <div className="min-w-0">
        {level === 1 ? <Heading>{title}</Heading> : <Heading level={2}>{title}</Heading>}
        {subtitle && <p className="mt-0.5 text-ui-subtle">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Heading({ level = 1, className, children }: { level?: 1 | 2 | 3; className?: string; children: React.ReactNode }) {
  if (level === 1) return <h1 className={cx('text-[18px] font-medium leading-7 text-ui-fg', className)}>{children}</h1>;
  if (level === 2) return <h2 className={cx('text-[16px] font-medium leading-6 text-ui-fg', className)}>{children}</h2>;
  return <h3 className={cx('text-[14px] font-medium leading-5 text-ui-fg', className)}>{children}</h3>;
}

/** Two-column detail page: fluid main + 440px side from 1280px. */
export function TwoColumn({ main, side }: { main: React.ReactNode; side: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 xl:grid xl:grid-cols-[minmax(0,1fr)_440px] xl:items-start xl:gap-x-4">
      <div className="flex min-w-0 flex-col gap-3">{main}</div>
      <div className="flex min-w-0 flex-col gap-3">{side}</div>
    </div>
  );
}

/** Label/value row used in detail cards. */
export function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 items-start gap-3 px-6 py-3">
      <span className="font-medium text-ui-subtle">{label}</span>
      <span className="min-w-0 break-words text-ui-fg">{children ?? '-'}</span>
    </div>
  );
}

/* ── Controls ───────────────────────────────────────────────── */

type ButtonVariant = 'primary' | 'secondary' | 'transparent' | 'danger';
type ButtonSize = 'small' | 'base' | 'large';

const variantCls: Record<ButtonVariant, string> = {
  primary: 'bg-ui-inverted text-ui-inverted-fg hover:opacity-90',
  secondary: 'bg-ui-base text-ui-fg shadow-ui-field hover:bg-ui-hover',
  transparent: 'text-ui-fg hover:bg-ui-hover',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};
const sizeCls: Record<ButtonSize, string> = {
  small: 'h-7 px-2 text-[13px] gap-1',
  base: 'h-8 px-3 text-[13px] gap-1.5',
  large: 'h-10 px-4 text-[14px] gap-2',
};

export const buttonClass = (variant: ButtonVariant = 'secondary', size: ButtonSize = 'base', className?: string) =>
  cx(
    'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 disabled:pointer-events-none disabled:opacity-50',
    variantCls[variant],
    sizeCls[size],
    className
  );

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'base', loading, className, children, disabled, type = 'button', ...rest },
  ref
) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} className={buttonClass(variant, size, className)} {...rest}>
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  );
});

export function LinkButton({ href, variant = 'secondary', size = 'base', className, children, ...rest }: { href: string; variant?: ButtonVariant; size?: ButtonSize; className?: string; children: React.ReactNode; target?: string }) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}

export function IconButton({ className, children, label, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type="button" aria-label={label} title={label} className={cx('inline-flex h-7 w-7 items-center justify-center rounded-md text-ui-subtle transition-colors hover:bg-ui-hover hover:text-ui-fg', className)} {...rest}>
      {children}
    </button>
  );
}

const fieldCls = 'ui-field rounded-md bg-ui-field px-2 text-[13px] text-ui-fg shadow-ui-field outline-none placeholder:text-ui-muted focus:ring-2 focus:ring-primary-300 disabled:opacity-60';

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cx(fieldCls, 'h-8 w-full py-1.5', className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  return (
    <select ref={ref} className={cx(fieldCls, 'h-8 py-1 pr-7', className ?? 'w-full')} {...rest}>
      {children}
    </select>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cx(fieldCls, 'min-h-[64px] w-full py-1.5', className)} {...rest} />;
});

export function Field({ label, hint, children, className }: { label: string; hint?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <label className={cx('flex flex-col gap-1.5', className)}>
      <span className="font-medium text-ui-fg">{label}</span>
      {children}
      {hint && <span className="text-[12px] text-ui-subtle">{hint}</span>}
    </label>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-ui-border bg-ui-bg px-1 font-sans text-[11px] text-ui-subtle">{children}</kbd>;
}

/* ── Status ─────────────────────────────────────────────────── */

type Tone = 'green' | 'orange' | 'red' | 'blue' | 'purple' | 'grey';

const toneCls: Record<Tone, string> = {
  green: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 [.admin-dark_&]:text-emerald-400',
  orange: 'bg-amber-500/10 text-amber-700 ring-amber-500/30 [.admin-dark_&]:text-amber-400',
  red: 'bg-red-500/10 text-red-700 ring-red-500/25 [.admin-dark_&]:text-red-400',
  blue: 'bg-blue-500/10 text-blue-700 ring-blue-500/25 [.admin-dark_&]:text-blue-400',
  purple: 'bg-violet-500/10 text-violet-700 ring-violet-500/25 [.admin-dark_&]:text-violet-400',
  grey: 'bg-ui-hover text-ui-subtle ring-ui-border',
};
const dotCls: Record<Tone, string> = {
  green: 'bg-emerald-500', orange: 'bg-amber-500', red: 'bg-red-500', blue: 'bg-blue-500', purple: 'bg-violet-500', grey: 'bg-zinc-400',
};

export function Badge({ tone = 'grey', dot = true, children }: { tone?: Tone; dot?: boolean; children: React.ReactNode }) {
  return (
    <span className={cx('inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-[12px] font-medium ring-1 ring-inset', toneCls[tone])}>
      {dot && <span className={cx('h-1.5 w-1.5 rounded-full', dotCls[tone])} />}
      {children}
    </span>
  );
}

const title = (s: string) => s.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export const ORDER_STATUS_TONE: Record<string, Tone> = {
  PENDING: 'orange', CONFIRMED: 'blue', PROCESSING: 'purple', SHIPPED: 'blue', OUT_FOR_DELIVERY: 'blue',
  DELIVERED: 'green', CANCELLED: 'red', RETURNED: 'grey', REFUNDED: 'grey',
};
export const PAYMENT_STATUS_TONE: Record<string, Tone> = {
  PENDING: 'orange', PROCESSING: 'blue', COMPLETED: 'green', FAILED: 'red', REFUNDED: 'grey',
};
export const PRODUCT_STATUS_TONE: Record<string, Tone> = { ACTIVE: 'green', DRAFT: 'grey', ARCHIVED: 'orange' };

export function StatusBadge({ status, tones }: { status: string; tones: Record<string, Tone> }) {
  const label = status === 'COMPLETED' ? 'Paid' : title(status);
  return <Badge tone={tones[status] || 'grey'}>{label}</Badge>;
}
export { title as humanize };

/* ── Feedback ───────────────────────────────────────────────── */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-md bg-ui-hover', className)} />;
}

export function EmptyState({ title: heading, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-6 py-12 text-center">
      <p className="font-medium text-ui-fg">{heading}</p>
      {description && <p className="max-w-sm text-ui-subtle">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/* ── Formatting ─────────────────────────────────────────────── */

export const inr = (n: number | string | null | undefined) => {
  const v = Number(n) || 0;
  const paise = Math.round(v * 100) % 100 !== 0;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: paise ? 2 : 0, maximumFractionDigits: paise ? 2 : 0 }).format(v);
};

export const shortDate = (d: string | Date) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
export const dateTime = (d: string | Date) =>
  new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
