'use client';

import { useSettings } from '@/lib/settings-context';
import { MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export function WhatsAppButton() {
  const { settings } = useSettings();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setMounted(true); }, []);

  if (!mounted || pathname?.startsWith('/admin') || !settings.showWhatsappButton || !settings.whatsappNumber) return null;

  const phone = settings.whatsappNumber.replace(/\D/g, '');
  const message = encodeURIComponent(`Hi! I need help with my order on ${settings.storeName}.`);
  const href = `https://wa.me/${phone}?text=${message}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#25D366] text-white px-4 py-3 rounded-full shadow-lg hover:bg-[#1ebe5d] transition-all hover:scale-105 group"
    >
      <MessageCircle className="w-5 h-5 fill-white" />
      <span className="text-sm font-medium max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap">
        Chat with us
      </span>
    </a>
  );
}
