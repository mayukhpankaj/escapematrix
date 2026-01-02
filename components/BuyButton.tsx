"use client";

import { useAuth, useUser } from '@clerk/nextjs';

export default function BuyButton() {
  const { userId } = useAuth();
  const { user } = useUser();

  const buy = async () => {
    if (!userId) {
      alert("Please sign in first");
      return;
    }

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pro_pending', 'true');
    }

    try {
      // Get user data from Clerk
      const userData = {
        userId,
        email: user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress,
        firstName: user?.firstName,
        lastName: user?.lastName,
        fullName: user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
      };

      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: userData,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("API Error:", errorText);
        alert(`Payment error: ${res.status} ${res.statusText}`);
        return;
      }

      const data = await res.json();
      
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        alert("Error: No checkout URL received");
      }
    } catch (error) {
      console.error("Payment error:", error);
      alert("Payment failed. Please try again.");
    }
  };

  return (
    <button
      onClick={buy}
      className="w-full h-14 rounded-2xl bg-slate-900 text-white text-lg font-semibold tracking-wide shadow-lg shadow-slate-900/30 hover:bg-slate-800 transition-colors"
    >
      Upgrade life
    </button>
  );
}
