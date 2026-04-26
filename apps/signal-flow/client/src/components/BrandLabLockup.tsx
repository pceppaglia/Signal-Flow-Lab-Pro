import { BRANDING_HORIZ_LOGO_URL } from '@/const';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';

type BrandLabLockupProps = {
  className?: string;
  logoClassName?: string;
};

export function BrandLabLockup({
  className,
  logoClassName,
}: BrandLabLockupProps) {
  return (
    <Link
      href="/"
      className={cn(
        'flex min-w-0 max-w-full items-center gap-2 transition-opacity hover:opacity-90 sm:gap-3',
        className,
      )}
    >
      <img
        src={BRANDING_HORIZ_LOGO_URL}
        alt="RecordingStudio.com"
        className={cn(
          'h-16 w-auto max-w-[min(100%,min(90vw,520px))] shrink-0 object-contain object-left',
          logoClassName,
        )}
      />
      <span
        className="shrink-0 text-sm font-semibold tracking-tight text-white/90 sm:text-base"
        style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
      >
        {' | THE LAB'}
      </span>
    </Link>
  );
}
