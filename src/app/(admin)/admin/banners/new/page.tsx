'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { BannerForm, EMPTY_BANNER } from '@/components/admin/banner-form';
import { isBannerPosition } from '@/lib/banners';

function NewBanner() {
  const position = useSearchParams().get('position');
  return <BannerForm initial={{ ...EMPTY_BANNER, position: isBannerPosition(position) ? position : EMPTY_BANNER.position }} />;
}

export default function NewBannerPage() {
  return <Suspense><NewBanner /></Suspense>;
}
