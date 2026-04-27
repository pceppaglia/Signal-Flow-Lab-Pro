// apps/the-lab-hub/client/src/pages/NotFound.tsx
import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold text-[#E8A020]">404</h1>
        <p className="mb-8 text-xl text-zinc-400">Page Not Found</p>
        <Button asChild>
          <Link href="/">Go Home</Link>
        </Button>
      </div>
    </div>
  );
}
