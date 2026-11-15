'use client';

import { useState, useEffect } from 'react';
import { Mail, MessageSquare, Clock, CheckCircle, XCircle } from 'lucide-react';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
  reply: string | null;
}

const statusColors: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  REPLIED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-500',
};

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function ContactsPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => { fetchMessages(); }, []);

  const fetchMessages = async () => {
    const res = await fetch('/api/admin/contacts');
    const data = await res.json();
    setMessages(data.messages || []);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/admin/contacts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setMessages(prev => prev.map(m => m.id === id ? { ...m, status } : m));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
  };

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    setSending(true);
    await fetch(`/api/admin/contacts/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply, status: 'REPLIED' }),
    });
    setMessages(prev => prev.map(m => m.id === selected.id ? { ...m, reply, status: 'REPLIED' } : m));
    setSelected(prev => prev ? { ...prev, reply, status: 'REPLIED' } : null);
    setReply('');
    setSending(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Contact Messages</h1>
        <p className="text-gray-500 text-sm">{messages.filter(m => m.status === 'NEW').length} new messages</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : messages.length === 0 ? (
            <div className="p-10 text-center">
              <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No messages yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {messages.map(m => (
                <button key={m.id} onClick={() => setSelected(m)}
                  className={`w-full text-left px-4 py-3.5 hover:bg-gray-50 transition-colors ${selected?.id === m.id ? 'bg-primary-50' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${m.status === 'NEW' ? 'text-gray-900' : 'text-gray-600'}`}>{m.name}</p>
                      <p className="text-xs text-gray-400 truncate">{m.subject}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${statusColors[m.status]}`}>{m.status}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{fmtDate(m.createdAt)}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail */}
        <div className="lg:col-span-3">
          {!selected ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center h-full flex items-center justify-center">
              <div>
                <Mail className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Select a message to view</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{selected.subject}</h3>
                  <p className="text-sm text-gray-500">{selected.name} · {selected.email}{selected.phone ? ` · ${selected.phone}` : ''}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{fmtDate(selected.createdAt)}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[selected.status]}`}>{selected.status}</span>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selected.message}</p>
              </div>

              {selected.reply && (
                <div className="bg-[#DDEBE7] rounded-xl p-4">
                  <p className="text-xs font-semibold text-[#7FAF8E] mb-1">Your reply</p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selected.reply}</p>
                </div>
              )}

              {/* Status actions */}
              <div className="flex gap-2 flex-wrap">
                {['NEW', 'IN_PROGRESS', 'REPLIED', 'CLOSED'].map(s => (
                  <button key={s} onClick={() => updateStatus(selected.id, s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selected.status === s ? statusColors[s] : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>

              {/* Reply box */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reply to {selected.name}</label>
                <textarea value={reply} onChange={e => setReply(e.target.value)} rows={4}
                  placeholder="Type your reply..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary-400 resize-none" />
                <button onClick={sendReply} disabled={sending || !reply.trim()}
                  className="mt-2 px-5 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 disabled:opacity-50">
                  {sending ? 'Sending...' : 'Send Reply'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
