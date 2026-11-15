import { Metadata } from 'next';
import { DashboardStats } from './stats';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default function AdminDashboard() {
  return <DashboardStats />;
}
