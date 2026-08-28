"use client";

import { useState } from "react";
import { MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requestLocationChange } from "@/lib/actions/change-requests";
import type { StudentLocation } from "@/lib/actions/student-location";

export function ChildLocationPanel({
  studentId,
  locations,
  canRequestChange,
}: {
  studentId: string;
  locations: StudentLocation[];
  canRequestChange: boolean;
}) {
  const current = locations.find((l) => l.is_current);
  const [showForm, setShowForm] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Current Location</CardTitle>
        {canRequestChange && (
          <Button size="sm" variant="secondary" onClick={() => setShowForm((v) => !v)}>
            Request a change
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {current ? (
          <div>
            <p className="text-sm text-navy-900">
              {[current.address, current.area, current.city, current.region].filter(Boolean).join(", ") || "—"}
            </p>
            {current.landmark && <p className="text-sm text-ink-500">Landmark: {current.landmark}</p>}
          </div>
        ) : (
          <EmptyState icon={MapPin} title="No location on file" description="The school hasn't recorded a location yet." />
        )}

        {!canRequestChange && (
          <p className="mt-3 text-xs text-ink-500">
            Location changes by parents aren&apos;t enabled — contact the school office to update this.
          </p>
        )}

        {showForm && canRequestChange && <RequestLocationForm studentId={studentId} onDone={() => setShowForm(false)} />}
      </CardContent>
    </Card>
  );
}

function RequestLocationForm({ studentId, onDone }: { studentId: string; onDone: () => void }) {
  const [address, setAddress] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [landmark, setLandmark] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await requestLocationChange(studentId, { address, area, city, region, landmark });
    setBusy(false);
    if (result.success) {
      setSent(true);
    } else {
      setError(result.error);
    }
  }

  if (sent) {
    return (
      <Alert variant="success" className="mt-4">
        Your request has been submitted for admin review.
      </Alert>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 border-t border-gray-300 pt-4">
      {error && <Alert variant="error">{error}</Alert>}
      <Badge variant="neutral">Pending admin approval once submitted</Badge>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="req-address">Address</Label>
          <Input id="req-address" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="req-area">Area</Label>
          <Input id="req-area" value={area} onChange={(e) => setArea(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="req-city">City</Label>
          <Input id="req-city" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="req-region">Region</Label>
          <Input id="req-region" value={region} onChange={(e) => setRegion(e.target.value)} />
        </div>
        <div className="col-span-2">
          <Label htmlFor="req-landmark">Landmark</Label>
          <Input id="req-landmark" value={landmark} onChange={(e) => setLandmark(e.target.value)} />
        </div>
      </div>
      <Button type="submit" size="sm" disabled={busy}>
        <Send className="h-4 w-4" /> {busy ? "Submitting..." : "Submit request"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onDone} className="ml-2">
        Cancel
      </Button>
    </form>
  );
}
