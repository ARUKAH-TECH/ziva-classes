"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateTeacher, type TeacherRow } from "@/lib/actions/teachers";

export function TeacherProfileCard({ teacher }: { teacher: TeacherRow }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    first_name: teacher.first_name,
    last_name: teacher.last_name,
    phone: teacher.phone ?? "",
    employee_number: teacher.employee_number ?? "",
    qualification: teacher.qualification ?? "",
    specialization: teacher.specialization ?? "",
  });
  const [current, setCurrent] = useState(form);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setError(null);
    setSaving(true);
    const result = await updateTeacher(teacher.id, teacher.user_id, form);
    setSaving(false);
    if (result.success) {
      setCurrent(form);
      setEditing(false);
    } else {
      setError(result.error);
    }
  }

  function cancel() {
    setForm(current);
    setError(null);
    setEditing(false);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Profile</CardTitle>
        {!editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-4">
            {error && <Alert variant="error">{error}</Alert>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="e-first">First name</Label>
                <Input
                  id="e-first"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="e-last">Last name</Label>
                <Input
                  id="e-last"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="e-phone">Phone</Label>
                <Input
                  id="e-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
                <p className="mt-1 text-xs text-ink-500">Changing this also updates their login password.</p>
              </div>
              <div>
                <Label htmlFor="e-employee">Employee number</Label>
                <Input
                  id="e-employee"
                  value={form.employee_number}
                  onChange={(e) => setForm({ ...form, employee_number: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="e-qualification">Qualification</Label>
                <Input
                  id="e-qualification"
                  value={form.qualification}
                  onChange={(e) => setForm({ ...form, qualification: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="e-specialization">Specialization</Label>
                <Input
                  id="e-specialization"
                  value={form.specialization}
                  onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </Button>
              <Button variant="ghost" onClick={cancel} disabled={saving}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Email" value={teacher.email ?? "—"} />
            {teacher.login_id && <Field label="Login ID" value={teacher.login_id} />}
            <Field label="Phone" value={current.phone || "—"} />
            <Field label="Employee number" value={current.employee_number || "—"} />
            <Field label="Qualification" value={current.qualification || "—"} />
            <Field label="Specialization" value={current.specialization || "—"} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`mt-0.5 text-sm text-navy-900 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
