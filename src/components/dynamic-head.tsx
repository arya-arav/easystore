'use client';

import { useEffect } from 'react';
import { useSettings } from '@/lib/settings-context';
import { FONTS, THEME_STORAGE_KEY } from '@/lib/layout-settings';

export function DynamicHead() {
  const { settings, loading } = useSettings();

  // Inject favicon
  useEffect(() => {
    if (!settings.favicon) return;
    try {
      document.querySelectorAll("link[data-dynamic-favicon]").forEach((el) => {
        try { el.parentNode?.removeChild(el); } catch {}
      });
      const link = document.createElement('link');
      link.rel = 'icon';
      link.href = settings.favicon;
      link.setAttribute('data-dynamic-favicon', 'true');
      document.head.appendChild(link);
    } catch {}
  }, [settings.favicon]);

  // Theme: brand colours, accent and font as CSS custom properties
  const { primaryColor, secondaryColor } = settings;
  const accentColor = settings.layout?.accentColor;
  const font = settings.layout?.font;
  const themed = !!settings.layout?.theme;

  useEffect(() => {
    if (loading) return;
    const vars: Record<string, string> = {};
    if (primaryColor) vars['--color-primary'] = primaryColor;
    if (secondaryColor) vars['--color-secondary'] = secondaryColor;
    if (accentColor) vars['--color-accent'] = accentColor;
    // A chosen theme also tints the soft backgrounds; without one they keep the original mint.
    vars['--color-tint'] = themed && secondaryColor ? secondaryColor : '#DDEBE7';
    vars['--font-body'] = (font && FONTS[font]?.cssVar) || 'system-ui';

    const root = document.documentElement;
    for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);

    if (primaryColor) {
      let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
      if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; document.head.appendChild(meta); }
      meta.content = primaryColor;
    }

    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(vars));
    } catch {}
  }, [loading, primaryColor, secondaryColor, accentColor, font, themed]);

  return null;
}
