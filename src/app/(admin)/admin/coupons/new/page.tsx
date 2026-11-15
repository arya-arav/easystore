import { Metadata } from 'next';
import { CouponForm } from '../form';

export const metadata: Metadata = {
  title: 'Add Coupon',
};

export default function NewCouponPage() {
  return <CouponForm />;
}
