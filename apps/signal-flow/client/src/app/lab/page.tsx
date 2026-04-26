import { BrandLabLockup } from '@/components/BrandLabLockup';
import { LegalDisclaimerDialog } from '@/components/LegalDisclaimerDialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AudioWaveform, Headphones, Radio, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'wouter';

type LabGridItem = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** All hub grid labs are presented as coming soon (no routes yet). */
  status: 'coming-soon';
  /** Optional responsive column span (e.g. third card on sm). */
  colClass?: string;
};

const LAB_GRID_ITEMS: LabGridItem[] = [
  {
    id: 'signal-flow',
    title: 'Signal Flow Lab',
    description:
      'Hands-on routing, patch bays, and console workflows—practice signal flow like a pro.',
    icon: Radio,
    status: 'coming-soon',
  },
  {
    id: 'ear-training',
    title: 'Ear Training Lab',
    description:
      'Frequency and dynamics training built for engineers who listen for a living.',
    icon: Headphones,
    status: 'coming-soon',
  },
  {
    id: 'room-acoustics',
    title: 'Room Acoustics Simulator',
    description:
      'Explore how room modes, treatment, and speaker placement shape what you hear.',
    icon: AudioWaveform,
    status: 'coming-soon',
    colClass: 'sm:col-span-2 lg:col-span-1',
  },
];

function ComingSoonLabCard({ item }: { item: LabGridItem }) {
  const Icon = item.icon;
  return (
    <article
      className={cn(
        'flex min-h-0 cursor-default flex-col rounded-xl border border-white/10 bg-zinc-950/50 p-6 opacity-90',
        item.colClass,
      )}
    >
      <div className="mb-4 flex size-11 items-center justify-center rounded-lg border border-white/10 bg-white/5">
        <Icon className="size-5 text-zinc-500" aria-hidden />
      </div>
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-semibold tracking-wide text-zinc-200">
          {item.title}
        </h3>
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Soon
        </span>
      </div>
      <p className="flex-1 text-sm leading-relaxed text-zinc-600">
        {item.description}
      </p>
    </article>
  );
}

export default function LabEntrancePage() {
  const [legalOpen, setLegalOpen] = useState(false);

  return (
    <div
      className="min-h-screen overflow-x-hidden bg-black text-zinc-100 antialiased"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_85%_60%_at_50%_18%,rgba(232,160,32,0.08),transparent_55%)]" />

      <header className="relative z-10 border-b border-white/10 bg-black/80 backdrop-blur-md">
        <div className="mx-auto flex min-h-20 max-w-6xl items-center px-5 py-3 sm:px-8">
          <BrandLabLockup />
        </div>
      </header>

      <main className="relative z-10">
        <section className="relative px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-[#E8A020]/35 bg-[#E8A020]/5 px-4 py-1.5">
              <Zap className="size-3.5 text-[#E8A020]" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#E8A020] sm:text-xs">
                Interactive audio education
              </span>
            </div>

            <h1
              className="mb-6 text-5xl font-bold uppercase leading-[0.95] tracking-tight text-balance text-[#E8A020] sm:text-6xl md:text-7xl"
              style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
            >
              FIND YOUR SIGNATURE SOUND
            </h1>

            <p className="mx-auto mb-8 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
              The Vocal Chain Matchmaker uses diagnostic simulation to identify
              the perfect microphone and preamp combo for your unique voice.
            </p>

            <h3 className="mb-6 text-xl font-semibold uppercase tracking-[0.2em] text-[#E8A020] sm:text-3xl">
              Ready To Discover Your Perfect Vocal Chain?
            </h3>

            <div className="flex flex-col items-center justify-center">
              <Button
                asChild
                size="lg"
                className="h-12 w-full min-w-[220px] rounded-lg border-0 bg-[#C0392B] px-8 text-sm font-bold uppercase tracking-wider text-white shadow-none transition-all duration-300 hover:bg-[#E74C3C] hover:shadow-[0_0_20px_rgba(231,76,60,0.6)] sm:w-auto"
              >
                <Link href="/vocal-matchmaker">
                  Let&apos;s Find Your Perfect Match
                </Link>
              </Button>
            </div>

            <div className="mx-auto mt-14 w-full max-w-4xl opacity-75 sm:mt-16">
              <section
                aria-label="Product preview placeholder"
                className="aspect-video w-full rounded-xl border border-white/[0.06] bg-zinc-900/30"
              />
            </div>

            <p className="mt-10">
              <button
                type="button"
                onClick={() => setLegalOpen(true)}
                className="text-xs font-medium text-[#E8A020] underline underline-offset-4 transition-colors hover:text-[#F5B844]"
              >
                Legal Notice & Disclaimer
              </button>
            </p>
          </div>
        </section>

        <section className="border-t border-white/10 bg-black/40 px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <h2
              className="mb-2 text-center text-3xl font-bold uppercase tracking-wide text-[#E8A020] sm:text-4xl"
              style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
            >
              Coming soon
            </h2>
            <p className="mx-auto mb-12 max-w-lg text-center text-sm text-zinc-500">
              More immersive labs are on the way.
            </p>

            <div className="grid auto-rows-auto gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {LAB_GRID_ITEMS.map((item) => (
                <ComingSoonLabCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        </section>

        <footer className="border-t border-white/10 py-8 text-center">
          <p className="text-[11px] text-zinc-600">
            RecordingStudio.com — educational audio tools
          </p>
          <button
            type="button"
            onClick={() => setLegalOpen(true)}
            className="mt-3 text-[11px] font-medium text-[#E8A020] underline underline-offset-4 hover:text-[#F5B844]"
          >
            Legal Notice & Disclaimer
          </button>
        </footer>
      </main>

      <LegalDisclaimerDialog open={legalOpen} onOpenChange={setLegalOpen} />
    </div>
  );
}
