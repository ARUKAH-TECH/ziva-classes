"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { approveChangeRequest, rejectChangeRequest, type ChangeRequestRow } from "@/lib/actions/change-requests";

type RequestWithPreview = ChangeRequestRow & { preview_url?: string | null };

export function ChangeRequestBanner({ requests }: { requests: RequestWithPreview[] }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [handled, setHandled] = useState<Set<string>>(new Set());

  async function approve(r: ChangeRequestRow) {
    setBusyId(r.id);
    const result = await approveChangeRequest(r.id);
    setBusyId(null);
    if (!result.success) {
      alert(result.error);
      return;
    }
    window.location.reload();
  }

  async function reject(r: ChangeRequestRow) {
    const notes = prompt("Reason for rejecting (optional):") ?? "";
    setBusyId(r.id);
    const result = await rejectChangeRequest(r.id, notes);
    setBusyId(null);
    if (!result.success) {
      alert(result.error);
      return;
    }
    setHandled((prev) => new Set(prev).add(r.id));
  }

  const visible = requests.filter((r) => !handled.has(r.id));
  if (visible.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {visible.map((r) => (
        <div key={r.id} className="flex items-center justify-between rounded border border-warning/40 bg-amber-50 px-3 py-2.5">
          <div className="flex items-center gap-3 text-sm">
            {r.request_type === "PHOTO" && r.preview_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.preview_url} alt="Requested photo" className="h-12 w-10 rounded border border-gray-300 object-cover" />
            )}
            <div>
              <Badge variant="warning">Pending request</Badge>
              <span className="ml-2 text-navy-900">
                {r.parent_name} requested a {r.request_type === "PHOTO" ? "photo" : "location"} change
                {r.request_type === "LOCATION" && (
                  <>
                    : {[r.payload.address, r.payload.area, r.payload.city, r.payload.region].filter(Boolean).join(", ")}
                  </>
                )}
              </span>
            </div>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="secondary" onClick={() => approve(r)} disabled={busyId === r.id}>
              <Check className="h-4 w-4" /> Approve
            </Button>
            <Button size="sm" variant="ghost" onClick={() => reject(r)} disabled={busyId === r.id}>
              <X className="h-4 w-4" /> Reject
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
