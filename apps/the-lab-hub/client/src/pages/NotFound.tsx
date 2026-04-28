import { Button } from '@rs/ui';
import { Link } from 'wouter';

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
