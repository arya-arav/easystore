'use client';

import Script from 'next/script';
import { useSettings } from '@/lib/settings-context';
import { useEffect, useState } from 'react';

export function CustomHeadScript() {
  const { settings } = useSettings();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted || !settings.customHeadCode) return null;

  return (
    <Script
      id="custom-head-code"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: settings.customHeadCode }}
    />
  );
}

export function CustomBodyScript() {
  const { settings } = useSettings();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted || !settings.customBodyCode) return null;

  return (
    <Script
      id="custom-body-code"
      strategy="lazyOnload"
      dangerouslySetInnerHTML={{ __html: settings.customBodyCode }}
    />
  );
}
