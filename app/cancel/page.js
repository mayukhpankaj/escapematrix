"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Suspense } from 'react';

function CancelPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isFailedPayment, setIsFailedPayment] = useState(false);
  const [paymentId, setPaymentId] = useState(null);

  useEffect(() => {
    const status = searchParams.get('status');
    const paymentIdParam = searchParams.get('payment_id');
    
    if (status === 'failed') {
      setIsFailedPayment(true);
      setPaymentId(paymentIdParam);
      console.log('Payment failed:', { paymentId: paymentIdParam, status });
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Cancel/Failed Icon */}
        <div className="mb-8">
          <div className={`w-20 h-20 ${isFailedPayment ? 'bg-red-500' : 'bg-gray-400'} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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

        {/* Cancel/Failed Message */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {isFailedPayment ? "Payment Failed" : "Payment Cancelled"}
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          {isFailedPayment 
            ? "Your payment could not be processed. Please try again or use a different payment method."
            : "You were not charged. No worries, you can try again anytime."
          }
        </p>

        {isFailedPayment && paymentId && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <p className="text-sm text-red-800">
              <strong>Payment ID:</strong> {paymentId}<br/>
              <strong>Status:</strong> Failed<br/>
              Please check your payment details and try again.
            </p>
          </div>
        )}

        {/* Reassurance */}
        <div className="bg-white rounded-lg p-6 mb-8">
          <h1 className="text-lg font-semibold text-gray-900 mb-4">Dont want to Escape the Matrix ?</h1>
          <div className="space-y-3 text-left text-gray-700">
            <div className="flex items-center">
              
            </div>
            
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button 
            onClick={() => router.push('/pro')}
            className="w-full px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Retry Payment
          </button>

        </div>

        {/* Help Text */}
        <div className="mt-8 text-sm text-gray-500">
          Questions? Contact us at founder@deeptrue.ai
        </div>
      </div>
    </div>
  );
}

export default function CancelPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 flex items-center justify-center"><div>Loading...</div></div>}>
      <CancelPageContent />
    </Suspense>
  );
}
