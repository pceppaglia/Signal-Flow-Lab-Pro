import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export const LEGAL_DISCLAIMER_TEXT =
  'Notice: RecordingStudio.com is an independent educational platform. References to trademarked brands, models, or manufacturers (including but not limited to Neumann, SSL, Neve, etc.) are for educational simulation and comparative purposes only. Such references do not imply endorsement by, affiliation with, or sponsorship from the respective trademark holders.';

type LegalDisclaimerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LegalDisclaimerDialog({
  open,
  onOpenChange,
}: LegalDisclaimerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="max-w-lg border border-white/10 bg-zinc-950 text-zinc-100 shadow-2xl sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-white">
            Legal notice & disclaimer
          </DialogTitle>
          <DialogDescription className="text-left text-sm leading-relaxed text-zinc-400">
            {LEGAL_DISCLAIMER_TEXT}
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
