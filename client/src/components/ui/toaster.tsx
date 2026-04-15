import { Toaster as Sonner } from "sonner";

/** Toast notifications; uses Sonner directly so it works without `next-themes`. */
export function Toaster() {
  return <Sonner theme="dark" className="toaster group" richColors />;
}
