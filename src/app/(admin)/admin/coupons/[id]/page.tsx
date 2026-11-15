import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { CouponForm } from '../form';

export const metadata: Metadata = {
  title: 'Edit Coupon',
};

async function getCoupon(id: string) {
  return prisma.coupon.findUnique({
    where: { id },
  });
}

export default async function EditCouponPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const coupon = await getCoupon(params.id);

  if (!coupon) {
    notFound();
  }

  return <CouponForm coupon={JSON.parse(JSON.stringify(coupon))} />;
}
