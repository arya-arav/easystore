'use client';

import { useState, useEffect } from 'react';
import { Mail, Trash2, Download, Users } from 'lucide-react';
import { useConfirm } from '@/components/admin/overlays';

interface Subscriber {
  id: string;
  email: string;
  isActive: boolean;
  subscribedAt: string;
  unsubscribedAt: string | null;
}

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function NewsletterPage() {
  const confirm = useConfirm();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0 });
  const [filter, setFilter] = useState<'all' | 'active' | 'unsubscribed'>('active');

  useEffect(() => { fetchSubscribers(); }, []);

  const fetchSubscribers = async () => {
    const res = await fetch('/api/admin/newsletter');
    const data = await res.json();
    setSubscribers(data.subscribers || []);
    setStats({ total: data.total || 0, active: data.active || 0 });
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: 'Remove this subscriber?', confirmText: 'Remove', danger: true }))) return;
    await fetch('/api/admin/newsletter', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setSubscribers(prev => prev.filter(s => s.id !== id));
    setStats(prev => ({ ...prev, total: prev.total - 1 }));
  };

  const exportCSV = () => {
    const rows = [['Email', 'Status', 'Subscribed At']];
    filtered.forEach(s => rows.push([s.email, s.isActive ? 'Active' : 'Unsubscribed', fmtDate(s.subscribedAt)]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'newsletter-subscribers.csv'; a.click();
  };

  const filtered = subscribers.filter(s =>
    filter === 'all' ? true : filter === 'active' ? s.isActive : !s.isActive
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Newsletter Subscribers</h1>
          <p className="text-gray-500 text-sm">{stats.active} active · {stats.total} total</p>
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: Users, color: 'bg-blue-50 text-blue-600' },
          { label: 'Active', value: stats.active, icon: Mail, color: 'bg-green-50 text-green-600' },
          { label: 'Unsubscribed', value: stats.total - stats.active, icon: Mail, color: 'bg-gray-50 text-gray-500' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(['active', 'all', 'unsubscribed'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-primary-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Mail className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No subscribers yet</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-sm text-gray-500 border-b border-gray-100">
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Subscribed</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-sm text-gray-800">{s.email}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {s.isActive ? 'Active' : 'Unsubscribed'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500">{fmtDate(s.subscribedAt)}</td>
                  <td className="px-5 py-3">
                    <button onClick={() => handleDelete(s.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
