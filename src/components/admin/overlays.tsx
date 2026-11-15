'use client';

// Drawer (560px side panel) and Prompt (400px confirm dialog), as in the Medusa dashboard.
// useConfirm() replaces window.confirm with a styled, awaitable dialog.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button, Heading, IconButton } from './ui';

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);
}

function Portal({ children }: { children: React.ReactNode }) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  // Render inside the admin root so the .admin-ui tokens (and dark mode) apply.
  useEffect(() => setEl((document.querySelector('.admin-ui') as HTMLElement) || document.body), []);
  return el ? createPortal(children, el) : null;
}

export function Drawer({ open, onClose, title, description, children, footer }: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <Portal>
      <div className="fixed inset-0 z-[60] bg-black/30" onClick={onClose} />
      <div role="dialog" aria-modal="true" className="fixed inset-2 z-[61] flex flex-col overflow-hidden rounded-lg bg-ui-base text-ui-fg shadow-ui-modal sm:left-auto sm:w-full sm:max-w-[560px]">
        <div className="flex items-start justify-between gap-4 border-b border-ui-border px-6 py-4">
          <div>
            <Heading level={2}>{title}</Heading>
            {description && <p className="mt-0.5 text-ui-subtle">{description}</p>}
          </div>
          <IconButton label="Close" onClick={onClose}><X className="h-4 w-4" /></IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-ui-border px-6 py-4">{footer}</div>}
      </div>
    </Portal>
  );
}

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  danger?: boolean;
}

const ConfirmContext = createContext<(o: ConfirmOptions) => Promise<boolean>>(async () => false);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(v: boolean) => void>(() => {});
  const confirm = useCallback((o: ConfirmOptions) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => { resolver.current = resolve; });
  }, []);
  const close = useCallback((v: boolean) => {
    resolver.current(v);
    setOpts(null);
  }, []);
  useEscape(!!opts, () => close(false));

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts && (
        <Portal>
          <div className="fixed inset-0 z-[70] bg-black/30" onClick={() => close(false)} />
          <div role="alertdialog" aria-modal="true" className="fixed left-1/2 top-1/2 z-[71] w-[calc(100%-32px)] max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-ui-base text-ui-fg shadow-ui-modal">
            <div className="px-6 pt-6">
              <Heading level={2}>{opts.title}</Heading>
              {opts.description && <p className="mt-1 text-ui-subtle">{opts.description}</p>}
            </div>
            <div className="flex justify-end gap-2 p-6">
              <Button onClick={() => close(false)}>Cancel</Button>
              <Button variant={opts.danger ? 'danger' : 'primary'} onClick={() => close(true)} autoFocus>
                {opts.confirmText || 'Continue'}
              </Button>
            </div>
          </div>
        </Portal>
      )}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
