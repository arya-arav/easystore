'use client';

import { useEffect, useState } from 'react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayCheckoutProps {
  amount: number;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  onSuccess: (paymentId: string) => void;
  onError: (error: string) => void;
}

export default function RazorpayCheckout({
  amount,
  orderId,
  orderNumber,
  customerName,
  customerEmail,
  customerPhone,
  onSuccess,
  onError,
}: RazorpayCheckoutProps) {
  const [loading, setLoading] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => setRazorpayLoaded(true);
    script.onerror = () => onError('Failed to load payment gateway');
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [onError]);

  const initiatePayment = async () => {
    if (!razorpayLoaded) {
      onError('Payment gateway not loaded. Please refresh and try again.');
      return;
    }

    setLoading(true);

    try {
      // Create Razorpay order
      const response = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, orderId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment order');
      }

      // Open Razorpay checkout
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        order_id: data.orderId,
        name: document.title.split(' | ').pop() || 'Order',
        description: `Order #${orderNumber}`,
        image: '/logo.png',
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerPhone,
        },
        theme: {
          color: '#FF6B9D',
        },
        handler: async (response: any) => {
          try {
            // Verify payment
            const verifyResponse = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderId,
              }),
            });

            const verifyData = await verifyResponse.json();

            if (verifyResponse.ok && verifyData.success) {
              onSuccess(response.razorpay_payment_id);
            } else {
              onError(verifyData.error || 'Payment verification failed');
            }
          } catch (err) {
            onError('Payment verification failed');
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      onError(error.message || 'Payment initiation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={initiatePayment}
      disabled={loading || !razorpayLoaded}
      className="w-full bg-gradient-to-r from-pink-400 to-primary-500 text-white py-4 rounded-xl font-semibold hover:from-primary-500 hover:to-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      {loading ? (
        <>
          <span className="animate-spin">⏳</span>
          Processing...
        </>
      ) : (
        <>
          <span>💳</span>
          Pay ₹{amount.toLocaleString('en-IN')} with Razorpay
        </>
      )}
    </button>
  );
}
