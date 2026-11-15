'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';
import { CartProvider } from '@/lib/cart-context';
import { SettingsProvider } from '@/lib/settings-context';
import { CartDrawer } from '@/components/cart-drawer';
import { QuickViewModal } from '@/components/quick-view';
import { CustomHeadScript, CustomBodyScript } from '@/components/custom-scripts';
import { DynamicHead } from '@/components/dynamic-head';
import { WhatsAppButton } from '@/components/whatsapp-button';
import { CartSync } from '@/components/cart-sync';
import { CurrencyProvider } from '@/lib/currency-context';
import { useState } from 'react';

export function Providers({ children, settings }: { children: React.ReactNode; settings?: Record<string, unknown> | null }) {
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000,
          refetchOnWindowFocus: false,
        },
      },
    })
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <CartProvider>
          <SettingsProvider initial={settings as any}>
            <CurrencyProvider>
            <DynamicHead />
            <CartSync />
            <CustomHeadScript />
            {children}
            <CustomBodyScript />
            <WhatsAppButton />
            <Toaster
              position="bottom-right"
              toastOptions={{
                duration: 3000,
                style: {
                  background: '#333',
                  color: '#fff',
                  borderRadius: '8px',
                },
                success: {
                  iconTheme: {
                    primary: '#22c55e',
                    secondary: '#fff',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
            <CartDrawer />
            <QuickViewModal />
            </CurrencyProvider>
          </SettingsProvider>
        </CartProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
