'use client';

import { use, useEffect, useState } from 'react';
import { BannerForm, toLocalInput, type BannerFormValue } from '@/components/admin/banner-form';
import { Skeleton } from '@/components/admin/ui';
import { LinkButton, EmptyState, Container } from '@/components/admin/ui';
import { useBreadcrumb } from '../../../admin-layout';

export default function EditBannerPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const [value, setValue] = useState<BannerFormValue | null | 'missing'>(null);
  useBreadcrumb(value && value !== 'missing' ? value.title : null);

  useEffect(() => {
    fetch(`/api/admin/banners/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => setValue(b ? {
        title: b.title, subtitle: b.subtitle || '', image: b.image, link: b.link || '', position: b.position,
        isActive: b.isActive, sortOrder: b.sortOrder, showFrom: toLocalInput(b.showFrom), showTo: toLocalInput(b.showTo), design: b.design,
      } : 'missing'))
      .catch(() => setValue('missing'));
  }, [id]);

  if (value === 'missing') {
    return <Container><EmptyState title="Banner not found" description="It may have been deleted." action={<LinkButton href="/admin/banners">Back to banners</LinkButton>} /></Container>;
  }
  if (!value) return <div className="flex flex-col gap-3"><Skeleton className="h-8 w-60" /><Skeleton className="h-64" /><Skeleton className="h-96" /></div>;
  return <BannerForm id={id} initial={value} />;
}
