"use client";

import { useState } from "react";
import { Printer, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

// Navigating straight to the receipt PDF works fine on desktop (the server
// already sends Content-Disposition: inline), but plenty of mobile
// browsers force a download for any top-level navigation to a PDF
// regardless of that header — there's no app-side fix for that. Embedding
// it in an iframe inside a dialog sidesteps it entirely: the browser's PDF
// renderer shows it in place, on every platform, before anyone downloads
// or prints anything.
export function ReceiptViewerButton({
  paymentId,
  label = "Receipt",
}: {
  paymentId: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const url = `/api/payments/${paymentId}/receipt`;

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Printer className="h-4 w-4" /> {label}
      </Button>

      {open && (
        <Dialog open onClose={() => setOpen(false)} title="Receipt" className="max-w-3xl">
          <div className="space-y-3">
            <iframe
              src={url}
              title="Receipt preview"
              className="h-[75vh] w-full rounded border border-gray-300"
            />
            <div className="flex justify-end">
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-sm text-royal-600 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Open in new tab
              </a>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}
