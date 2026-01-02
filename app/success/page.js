"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

export default function SuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isTestMode, setIsTestMode] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pro_pending', 'true');
    }

    // Check if this is a test payment
    const test = searchParams.get('test');
    const userId = searchParams.get('userId');
    const paymentId = searchParams.get('payment_id');
    const status = searchParams.get('status');
    
    console.log('Payment details:', { paymentId, status, userId, test });

    // If this is a test payment, show success immediately
    if (test === 'true') {
      setIsTestMode(true);
      console.log('Test payment successful for user:', userId);
    } else if (status === 'succeeded') {
      console.log('Webhook-confirmed payment succeeded for user:', userId);
      // Log user details extraction
      console.log('User details extracted:', {
        userId,
        paymentId,
        status,
        timestamp: new Date().toISOString()
      });
    } else if (paymentId && !status) {
      // Check if payment was confirmed by webhook
      console.log('No status provided, checking webhook confirmation...');
      checkWebhookStatus(paymentId, userId);
      return;
    } else {
      // Any other status (failed, processing, requires_customer_action, etc.) is considered failed
      console.log(`Payment status "${status}" indicates failure, redirecting to failure page`);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('pro_pending');
      }
      router.push(`/cancel?payment_id=${paymentId}&status=failed`);
      return;
    }

    // Redirect to dashboard after 3 seconds only for successful payments
    if (status !== 'failed') {
      const timer = setTimeout(() => {
        router.push('/habits');
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [router, searchParams]);

  // Function to check webhook status
  const checkWebhookStatus = async (paymentId, userId) => {
    try {
      console.log(`Checking webhook status for payment: ${paymentId}`);
      const response = await fetch(`http://localhost:8000/api/payment-status/${paymentId}`);
      const data = await response.json();
      
      console.log('Webhook status response:', data);
      
      if (data.status === 'succeeded') {
        console.log('✅ Payment confirmed by webhook, showing success');
        // Update URL to show success
        router.replace(`/success?payment_id=${paymentId}&status=succeeded&userId=${userId}`);
      } else {
        console.log('❌ Payment not confirmed by webhook, redirecting to failure');
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('pro_pending');
        }
        router.push(`/cancel?payment_id=${paymentId}&status=failed`);
      }
    } catch (error) {
      console.error('Error checking webhook status:', error);
      console.log('Failed to check webhook status, redirecting to failure');
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('pro_pending');
      }
      router.push(`/cancel?payment_id=${paymentId}&status=failed`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Success Icon */}
        <div className="mb-8">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
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

        {/* Success Message */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {isTestMode ? "Test Payment Successful! 🎉" : "Payment successful! 🎉"}
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          {isTestMode 
            ? "Test payment completed successfully.You'll be redirected to your dashboard shortly."
            : "Your access is being activated. You'll be redirected to your dashboard shortly."
          }
        </p>
        
        {isTestMode && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <p className="text-sm text-blue-800">
              <strong>Test Mode:</strong> This was a simulated payment. In production, real payments would be processed through DodoPayments.
            </p>
          </div>
        )}

        {/* Features Unlocked */}
        <div className="bg-white rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">You now have access to:</h2>
          <div className="space-y-2 text-left">
            <div className="flex items-center text-gray-700">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Unlimited habit tracking
            </div>
            <div className="flex items-center text-gray-700">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Advanced analytics
            </div>
            <div className="flex items-center text-gray-700">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Custom templates
            </div>
            <div className="flex items-center text-gray-700">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Priority support
            </div>
          </div>
        </div>

        {/* Redirect Message */}
        <div className="text-sm text-gray-500">
          Redirecting to dashboard in <span className="font-semibold">3 seconds</span>...
        </div>

        {/* Manual Link */}
        <button 
          onClick={() => router.push('/habits')}
          className="mt-4 text-blue-600 hover:text-blue-800 underline text-sm"
        >
          Go to dashboard now
        </button>
      </div>
    </div>
  );
}
