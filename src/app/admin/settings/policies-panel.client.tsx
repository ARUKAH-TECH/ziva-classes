"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  updateOrganizationSettings,
  type Organization,
  type OrganizationSettings,
} from "@/lib/actions/organization";

export function PoliciesPanel({ organization }: { organization: Organization | null }) {
  const [settings, setSettings] = useState<OrganizationSettings>(
    organization?.settings ?? {
      parent_can_edit_location: false,
      parent_can_edit_photo: false,
      ranking_enabled_default: false,
      currency_symbol: "GHS",
    }
  );
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function save() {
    setStatus(null);
    setSubmitting(true);
    const result = await updateOrganizationSettings(settings);
    setSubmitting(false);
    setStatus(
      result.success
        ? { type: "success", message: "Policies updated." }
        : { type: "error", message: result.error }
    );
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Organization policies</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {status && <Alert variant={status.type}>{status.message}</Alert>}

        <Toggle
          label="Parents can edit their child's current location"
          description="Submitted changes go into an approval queue for admin review — they never apply immediately."
          checked={settings.parent_can_edit_location}
          onChange={(v) => setSettings((s) => ({ ...s, parent_can_edit_location: v }))}
        />
        <Toggle
          label="Parents can update their child's photo"
          description="Also goes through the approval queue before it replaces the official photo."
          checked={settings.parent_can_edit_photo}
          onChange={(v) => setSettings((s) => ({ ...s, parent_can_edit_photo: v }))}
        />
        <Toggle
          label="Enable class ranking by default on new terminal reports"
          description="Can still be turned on/off per report. Off by default per requirement — not every student needs a position."
          checked={settings.ranking_enabled_default}
          onChange={(v) => setSettings((s) => ({ ...s, ranking_enabled_default: v }))}
        />

        <div className="max-w-xs">
          <Label htmlFor="currency">Currency symbol</Label>
          <Select
            id="currency"
            value={settings.currency_symbol}
            onChange={(e) => setSettings((s) => ({ ...s, currency_symbol: e.target.value }))}
          >
            <option value="GHS">GH₵ — Ghana Cedi</option>
          </Select>
        </div>

        <Button onClick={save} disabled={submitting}>
          {submitting ? "Saving..." : "Save policies"}
        </Button>
      </CardContent>
    </Card>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-gray-300 text-royal-600 focus:ring-royal-600"
      />
      <span>
        <span className="block text-sm font-medium text-navy-900">{label}</span>
        <span className="block text-xs text-ink-500">{description}</span>
      </span>
    </label>
  );
}
