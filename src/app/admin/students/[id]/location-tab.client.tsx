"use client";

import { useState } from "react";
import { MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { addStudentLocation, type StudentLocation } from "@/lib/actions/student-location";
import { ChangeRequestBanner } from "@/components/domain/change-request-banner.client";
import type { ChangeRequestRow } from "@/lib/actions/change-requests";

export function LocationTab({
  studentId,
  locations,
  pendingRequests,
}: {
  studentId: string;
  locations: StudentLocation[];
  pendingRequests: ChangeRequestRow[];
}) {
  const [showForm, setShowForm] = useState(locations.length === 0);
  const current = locations.find((l) => l.is_current);
  const history = locations.filter((l) => !l.is_current);

  return (
    <div className="space-y-6">
      <ChangeRequestBanner requests={pendingRequests} />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Current location</CardTitle>
          <Button size="sm" variant="secondary" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" /> {current ? "Update location" : "Add location"}
          </Button>
        </CardHeader>
        <CardContent>
          {current ? (
            <LocationSummary loc={current} />
          ) : (
            <EmptyState
              icon={MapPin}
              title="No location on file"
              description="Add the student's current location — important for home-service session scheduling."
            />
          )}

          {showForm && <AddLocationForm studentId={studentId} onDone={() => setShowForm(false)} />}
        </CardContent>
      </Card>

      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Location history</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {history.map((l) => (
                <li key={l.id} className="rounded border border-gray-300 px-3 py-2.5">
                  <LocationSummary loc={l} compact />
                  <p className="mt-1 text-xs text-ink-500">
                    {new Date(l.effective_from).toLocaleDateString()} –{" "}
                    {l.effective_to ? new Date(l.effective_to).toLocaleDateString() : "—"}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LocationSummary({ loc, compact = false }: { loc: StudentLocation; compact?: boolean }) {
  const parts = [loc.address, loc.area, loc.city, loc.region].filter(Boolean);
  return (
    <div>
      <p className={compact ? "text-sm text-navy-900" : "text-base font-medium text-navy-900"}>
        {parts.length > 0 ? parts.join(", ") : "—"}
      </p>
      {loc.landmark && <p className="text-sm text-ink-500">Landmark: {loc.landmark}</p>}
      {(loc.latitude || loc.longitude) && (
        <p className="text-xs text-ink-500">
          {loc.latitude}, {loc.longitude}
        </p>
      )}
      {!compact && (
        <Badge variant="success" className="mt-2">
          Current
        </Badge>
      )}
    </div>
  );
}

function AddLocationForm({ studentId, onDone }: { studentId: string; onDone: () => void }) {
  const [address, setAddress] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [landmark, setLandmark] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await addStudentLocation(studentId, {
      address,
      area,
      city,
      region,
      landmark,
      latitude: lat,
      longitude: lng,
    });
    setBusy(false);
    if (result.success) {
      window.location.reload();
    } else {
      setError(result.error);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 border-t border-gray-300 pt-4">
      {error && <Alert variant="error">{error}</Alert>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="loc-address">Address</Label>
          <Input id="loc-address" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="loc-area">Area</Label>
          <Input id="loc-area" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Ejisu" />
        </div>
        <div>
          <Label htmlFor="loc-city">City</Label>
          <Input id="loc-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Kumasi" />
        </div>
        <div>
          <Label htmlFor="loc-region">Region</Label>
          <Input id="loc-region" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Ashanti" />
        </div>
        <div className="col-span-2">
          <Label htmlFor="loc-landmark">Landmark</Label>
          <Input id="loc-landmark" value={landmark} onChange={(e) => setLandmark(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="loc-lat">Latitude (optional)</Label>
          <Input id="loc-lat" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="6.6885" />
        </div>
        <div>
          <Label htmlFor="loc-lng">Longitude (optional)</Label>
          <Input id="loc-lng" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="-1.6244" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? "Saving..." : "Save location"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
