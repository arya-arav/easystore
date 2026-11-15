import { isBannerPosition, parseDesign } from '@/lib/banners';

const date = (v: unknown) => {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Validates an admin banner form. Returns the Prisma data or an error message. */
export function bannerInput(body: any): { data: any } | { error: string } {
  const title = typeof body?.title === 'string' ? body.title.trim().slice(0, 120) : '';
  const image = typeof body?.image === 'string' ? body.image.trim() : '';
  if (!title) return { error: 'Add a title (it is also the picture’s alt text)' };
  if (!image) return { error: 'Upload a banner picture' };
  if (!isBannerPosition(body.position)) return { error: 'Choose where the banner shows' };
  const showFrom = date(body.showFrom);
  const showTo = date(body.showTo);
  if (showFrom && showTo && showTo < showFrom) return { error: 'The end date is before the start date' };
  const link = typeof body.link === 'string' ? body.link.trim().slice(0, 500) : '';
  return {
    data: {
      title,
      subtitle: typeof body.subtitle === 'string' && body.subtitle.trim() ? body.subtitle.trim().slice(0, 200) : null,
      image,
      link: link || null,
      position: body.position,
      isActive: body.isActive !== false,
      sortOrder: Number.isFinite(Number(body.sortOrder)) ? Math.trunc(Number(body.sortOrder)) : 0,
      showFrom,
      showTo,
      design: parseDesign(body.design) as any,
    },
  };
}
