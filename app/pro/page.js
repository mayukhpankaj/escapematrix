"use client";

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ShieldCheck, Zap, LineChart, Sparkles } from 'lucide-react';
import BuyButton from '@/components/BuyButton';

const featureHighlights = [
  {
    title: 'Build Streaks',
    description: 'Build streaks and break bad habits.',
    icon: Zap,
  },
  {
    title: 'Track Progress',
    description: 'Compete with yourself.',
    icon: LineChart,
  },
];

const trustBadges = [
  { label: 'Bank-grade security', icon: ShieldCheck },
  { label: '30-day guarantee', icon: Sparkles },
];

export default function ProPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/');
    }
  }, [isSignedIn, isLoaded, router]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const run = async () => {
      try {
        const res = await fetch(`/api/pro-status?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const { isPro } = await res.json();
        if (isPro) {
          router.replace('/habits');
        }
      } catch {
        // ignore
      }
    };

    run();
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    const message = !isLoaded ? 'Loading...' : 'Redirecting...';
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white text-xl">
        {message}
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-950 text-white overflow-hidden">
      <Image
        src="https://res.cloudinary.com/dp8k9xyhd/image/upload/image_uskrne.png"
        alt="Hero background"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/95 via-slate-950/80 to-slate-900/40" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 lg:px-12 py-16 space-y-16">
        <header className="space-y-8">
          <Image
            src="/logo/logo-white.png"
            alt="Escape Matrix"
            width={240}
            height={80}
            className="w-64 h-auto object-contain"
            priority
          />
          <div className="max-w-3xl space-y-6">
      
            {/* <h1 className="text-4xl sm:text-5xl lg:text-[58px] font-semibold leading-tight">
              Build your future.
            </h1> */}
       
          </div>
        </header>

        <section className="grid lg:grid-cols-[0.95fr_1.05fr] gap-10 lg:gap-14 items-start">
          <div className="bg-white rounded-[32px] text-slate-900 shadow-[0_35px_120px_rgba(15,23,42,0.55)] border border-white/60 px-8 py-10 sm:px-10 sm:py-12 space-y-8">
            <div className="space-y-3">
              <p className="text-sm font-semibold tracking-[0.35em] uppercase text-slate-500">Crush 2026</p>
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-semibold text-slate-950">$1</span>
                <span className="text-slate-500 text-lg">/ year</span>
              </div>
              <p className="text-base text-slate-600">
               Are you ready to Escape the Matrix ?
              </p>
            </div>

            <ul className="space-y-4">
              {[
                'Unlimited rhabit ',
                'Progress Tracking',
                'AI calling agent coming soon',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-slate-700">
                  <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white">
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="space-y-4">
              <BuyButton />
              <p className="text-sm text-slate-500">
                Secure Checkout
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {featureHighlights.map(({ title, description, icon: Icon }) => (
              <div
                key={title}
                className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-7 backdrop-blur-lg flex items-start gap-4"
              >
                <div className="rounded-full bg-white/10 p-3 text-white">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{title}</h3>
                  <p className="text-white/75 text-base leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid sm:grid-cols-2 gap-4 text-sm text-white/80">
          {trustBadges.map(({ label, icon: Icon }) => (
            <div
              key={label}
              className="flex items-center gap-3 border border-white/10 rounded-2xl bg-white/5 px-5 py-4 backdrop-blur"
            >
              <Icon className="w-5 h-5 text-white" />
              <span className="uppercase tracking-[0.3em]">{label}</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
