"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

export default function ProcessingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('processing');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pro_pending', 'true');
    }

    const paymentId = searchParams.get('payment_id');
    const test = searchParams.get('test');
    const userId = searchParams.get('userId');
    
    console.log('Processing payment:', { paymentId, test, userId });

    // If it's a test payment, redirect to success immediately
    if (test === 'true') {
      setTimeout(() => {
        router.push(`/success?test=true&userId=${userId}`);
      }, 1500);
      return;
    }

    // For real payments, check webhook status before deciding
    if (paymentId) {
      // Check payment status via webhook API
      checkPaymentStatus(paymentId, userId);
    } else {
      // No payment ID, redirect to success
      setTimeout(() => {
        router.push('/success');
      }, 1500);
    }
  }, [router, searchParams]);

  // Function to check payment status via webhook API
  const checkPaymentStatus = async (paymentId, userId) => {
    try {
      console.log(`Checking webhook status for payment: ${paymentId}`);
      const response = await fetch(`http://localhost:8000/api/payment-status/${paymentId}`);
      const data = await response.json();
      
      console.log('Webhook status response:', data);
      
      // Give some time for webhook to be processed
      setTimeout(() => {
        if (data.status === 'succeeded') {
          console.log('✅ Payment confirmed by webhook, redirecting to success');
          setStatus('succeeded');
          setTimeout(() => {
            router.push(`/success?payment_id=${paymentId}&status=succeeded&userId=${userId}`);
          }, 1000);
        } else {
          console.log('❌ Payment not confirmed by webhook, redirecting to failure');
          setStatus('failed');
          setTimeout(() => {
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('pro_pending');
            }
            router.push(`/cancel?payment_id=${paymentId}&status=failed`);
          }, 1000);
        }
      }, 2000); // Wait 2 seconds for webhook processing
    } catch (error) {
      console.error('Error checking webhook status:', error);
      console.log('Failed to check webhook status, redirecting to failure');
      setStatus('failed');
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('pro_pending');
        }
        router.push(`/cancel?payment_id=${paymentId}&status=failed`);
      }, 1000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Processing Icon */}
        <div className="mb-8">
          <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            {status === 'processing' && (
              <svg className="w-10 h-10 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            {status === 'succeeded' && (
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {status === 'failed' && (
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <Image 
            src="https://customer-assets.emergentagent.com/job_matrix-escape-11/artifacts/t95qed68_fontbolt%20%283%29.png"
            alt="Escape Matrix"
            width={300}
            height={72}
            className="w-2/3 h-auto object-contain mx-auto mb-6"
            priority
          />
        </div>

        {/* Processing Message */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {status === 'processing' && "Processing Payment..."}
          {status === 'succeeded' && "Payment Successful!"}
          {status === 'failed' && "Payment Failed"}
        </h1>
        
        <p className="text-lg text-gray-600 mb-8">
          {status === 'processing' && "Please wait while we confirm your payment status."}
          {status === 'succeeded' && "Your payment has been processed successfully."}
          {status === 'failed' && "There was an issue processing your payment."}
        </p>

        {/* Loading Animation */}
        {status === 'processing' && (
          <div className="flex justify-center mb-8">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}

        {/* Status Details */}
        <div className="bg-white rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h2>
          <div className="space-y-2 text-left text-gray-700">
            <div className="flex justify-between">
              <span className="text-sm">Status:</span>
              <span className={`text-sm font-semibold ${
                status === 'processing' ? 'text-blue-600' : 
                status === 'succeeded' ? 'text-green-600' : 'text-red-600'
              }`}>
                {status === 'processing' && 'Processing...'}
                {status === 'succeeded' && 'Completed'}
                {status === 'failed' && 'Failed'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Transaction ID:</span>
              <span className="text-sm font-mono">{searchParams.get('payment_id') || 'Processing...'}</span>
            </div>
          </div>
        </div>

        {/* Redirect Message */}
        <div className="text-sm text-gray-500">
          {status === 'processing' && "Verifying payment status..."}
          {status === 'succeeded' && "Redirecting to success page..."}
          {status === 'failed' && "Redirecting to payment options..."}
        </div>
      </div>
    </div>
  );
}
