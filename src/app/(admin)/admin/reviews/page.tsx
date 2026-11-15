'use client';

import { useState, useEffect } from 'react';
import { Star, Check, X, MessageSquare, Trash2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useConfirm } from '@/components/admin/overlays';

interface Review {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  isVerified: boolean;
  isApproved: boolean;
  helpfulCount: number;
  createdAt: string;
  user: { name: string; email: string };
  product: { name: string; slug: string };
}

export default function ReviewsPage() {
  const confirm = useConfirm();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reviews?filter=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews);
      }
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [filter]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await fetch(`/api/admin/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isApproved: true }),
      });
      fetchReviews();
    } catch (err) {
      console.error('Failed to approve:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!(await confirm({ title: 'Delete this review?', confirmText: 'Delete', danger: true }))) return;
    setActionLoading(id);
    try {
      await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' });
      fetchReviews();
    } catch (err) {
      console.error('Failed to reject:', err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="bg-white rounded-2xl h-64"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
          <p className="text-gray-500">Manage customer reviews and ratings</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['pending', 'approved', 'all'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl font-medium transition-colors ${
              filter === f ? 'bg-primary-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {reviews.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">
            {filter === 'pending' ? 'No pending reviews' : 'No reviews yet'}
          </h3>
          <p className="text-gray-500">
            {filter === 'pending'
              ? 'All reviews have been moderated'
              : 'Customer reviews will appear here for moderation'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{review.user.name}</p>
                    <p className="text-sm text-gray-500">{review.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      review.isApproved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {review.isApproved ? 'Approved' : 'Pending'}
                  </span>
                  {review.isVerified && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      Verified Purchase
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-2">
                <Link
                  href={`/products/${review.product.slug}`}
                  target="_blank"
                  className="text-sm text-primary-500 hover:underline flex items-center gap-1"
                >
                  {review.product.name}
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              {review.title && <h4 className="font-medium text-gray-800 mt-4">{review.title}</h4>}
              {review.comment && <p className="text-gray-600 mt-2">{review.comment}</p>}

              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-xs text-gray-400">
                  {new Date(review.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
                <div className="flex items-center gap-2">
                  {!review.isApproved && (
                    <button
                      onClick={() => handleApprove(review.id)}
                      disabled={actionLoading === review.id}
                      className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" /> Approve
                    </button>
                  )}
                  <button
                    onClick={() => handleReject(review.id)}
                    disabled={actionLoading === review.id}
                    className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
