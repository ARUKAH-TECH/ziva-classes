"use client";

import { useState } from "react";
import { Plus, UserCog, Copy, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ResetPasswordButton } from "@/components/domain/reset-password-button.client";
import { ViewPasswordButton } from "@/components/domain/view-password-button.client";
import { createParent, updateParent, deleteParent, setParentActive, type ParentRow } from "@/lib/actions/parents";

export function ParentsClient({
  initialParents,
  canViewPassword,
}: {
  initialParents: ParentRow[];
  canViewPassword: boolean;
}) {
  const [parents, setParents] = useState(initialParents);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<ParentRow | null>(null);

  return (
    <Card>
      <CardContent>
        <div className="mb-4 flex justify-end">
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add parent
          </Button>
        </div>

        {parents.length === 0 ? (
          <EmptyState
            icon={UserCog}
            title="No parent accounts yet"
            description="Add a parent account, then link their children from the student's profile."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Email</TH>
                <TH>Phone</TH>
                <TH>Occupation</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {parents.map((p) => (
                <TR key={p.id}>
                  <TD className="font-medium text-navy-900">
                    {p.first_name} {p.last_name}
                  </TD>
                  <TD>{p.email ?? (p.login_id ? <span className="font-mono text-xs">{p.login_id}</span> : "—")}</TD>
                  <TD>{p.phone ?? "—"}</TD>
                  <TD>{p.occupation ?? "—"}</TD>
                  <TD>
                    <Badge variant={p.is_active ? "success" : "neutral"}>
                      {p.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(p)}>
                        <Pencil className="h-4 w-4" /> Edit
                      </Button>
                      <ResetPasswordButton userId={p.user_id} />
                      {canViewPassword && <ViewPasswordButton userId={p.user_id} />}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          const result = await setParentActive(p.user_id, !p.is_active);
                          if (result.success) {
                            setParents((prev) =>
                              prev.map((x) => (x.id === p.id ? { ...x, is_active: !p.is_active } : x))
                            );
                          } else {
                            alert(result.error);
                          }
                        }}
                      >
                        {p.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <DeleteParentButton
                        parent={p}
                        onDeleted={() => setParents((prev) => prev.filter((x) => x.id !== p.id))}
                      />
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardContent>

      <AddParentDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <EditParentDialog
        parent={editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) => {
          setParents((prev) => prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
          setEditing(null);
        }}
      />
    </Card>
  );
}

function EditParentDialog({
  parent,
  onClose,
  onSaved,
}: {
  parent: ParentRow | null;
  onClose: () => void;
  onSaved: (updated: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    occupation: string | null;
    address: string | null;
  }) => void;
}) {
  // key={parent.id} below remounts this whenever a different row is opened,
  // so useState's initial value is always fresh — no effect/sync needed.
  return (
    <Dialog open={!!parent} onClose={onClose} title="Edit parent">
      {parent && <EditParentForm key={parent.id} parent={parent} onSaved={onSaved} />}
    </Dialog>
  );
}

function EditParentForm({
  parent,
  onSaved,
}: {
  parent: ParentRow;
  onSaved: (updated: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    occupation: string | null;
    address: string | null;
  }) => void;
}) {
  const [firstName, setFirstName] = useState(parent.first_name);
  const [lastName, setLastName] = useState(parent.last_name);
  const [phone, setPhone] = useState(parent.phone ?? "");
  const [occupation, setOccupation] = useState(parent.occupation ?? "");
  const [address, setAddress] = useState(parent.address ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const result = await updateParent(parent.id, parent.user_id, {
      first_name: firstName,
      last_name: lastName,
      phone,
      occupation,
      address,
    });
    setSaving(false);
    if (result.success) {
      onSaved({
        id: parent.id,
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        occupation: occupation || null,
        address: address || null,
      });
    } else {
      setError(result.error);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="ep-first">First name</Label>
          <Input id="ep-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="ep-last">Last name</Label>
          <Input id="ep-last" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        </div>
      </div>
      <div>
        <Label htmlFor="ep-phone">Phone</Label>
        <Input id="ep-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <p className="mt-1 text-xs text-ink-500">
          Changing this also updates their login password (and their children&apos;s, if any).
        </p>
      </div>
      <div>
        <Label htmlFor="ep-occupation">Occupation</Label>
        <Input id="ep-occupation" value={occupation} onChange={(e) => setOccupation(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="ep-address">Address</Label>
        <Input id="ep-address" value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
      <Button type="submit" disabled={saving} className="w-full">
        {saving ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}

function DeleteParentButton({ parent, onDeleted }: { parent: ParentRow; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fullName = `${parent.first_name} ${parent.last_name}`;

  async function confirmDelete() {
    setError(null);
    setDeleting(true);
    const result = await deleteParent(parent.user_id);
    setDeleting(false);
    if (result.success) {
      setOpen(false);
      onDeleted();
    } else {
      setError(result.error);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="border border-error/30 text-error hover:bg-error/10"
        onClick={() => {
          setConfirmText("");
          setError(null);
          setOpen(true);
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <Dialog open={open} onClose={() => (!deleting ? setOpen(false) : undefined)} title="Delete parent">
        <p className="mb-4 text-sm text-ink-500">
          This permanently deletes <strong>{fullName}</strong>&apos;s account and login, and unlinks them
          from any children. This cannot be undone. Type their full name below to confirm.
        </p>
        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}
        <Input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={fullName}
          className="mb-4"
        />
        <div className="flex gap-2">
          <Button
            variant="danger"
            disabled={confirmText !== fullName || deleting}
            onClick={confirmDelete}
          >
            {deleting ? "Deleting..." : "Permanently delete"}
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={deleting}>
            Cancel
          </Button>
        </div>
      </Dialog>
    </>
  );
}

function AddParentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [occupation, setOccupation] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ email: string; tempPassword: string; loginId: string | null } | null>(
    null
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await createParent({ first_name: firstName, last_name: lastName, email, phone, occupation, address });
    setBusy(false);
    if (result.success) {
      setCreated({ email, tempPassword: result.data.tempPassword, loginId: result.data.loginId });
    } else {
      setError(result.error);
    }
  }

  function finish() {
    window.location.reload();
  }

  if (created) {
    return (
      <Dialog open onClose={finish} title="Parent account created">
        <div className="space-y-4">
          <Alert variant="success">
            {created.loginId
              ? `${firstName} ${lastName} can now sign in on the ID tab of the login page.`
              : `${created.email} can now sign in.`}{" "}
            Their password is their phone number — share these credentials securely.
          </Alert>
          <div className="rounded border border-gray-300 bg-surface p-3 font-mono text-sm">
            {created.loginId ? <p>Login ID: {created.loginId}</p> : <p>Email: {created.email}</p>}
            <p className="flex items-center gap-2">
              Password: {created.tempPassword}
              <button
                onClick={() => navigator.clipboard.writeText(created.tempPassword)}
                className="rounded p-1 text-ink-500 hover:bg-gray-100"
                aria-label="Copy password"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </p>
          </div>
          <Button onClick={finish} className="w-full">
            Done
          </Button>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} title="Add parent">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="p-first">First name</Label>
            <Input id="p-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="p-last">Last name</Label>
            <Input id="p-last" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </div>
        </div>
        <div>
          <Label htmlFor="p-email">Email (optional)</Label>
          <Input id="p-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <p className="mt-1 text-xs text-ink-500">
            Leave blank to generate a Parent ID they can sign in with instead of an email.
          </p>
        </div>
        <div>
          <Label htmlFor="p-phone">Phone</Label>
          <Input id="p-phone" value={phone} onChange={(e) => setPhone(e.target.value)} required minLength={6} />
          <p className="mt-1 text-xs text-ink-500">This becomes the parent&apos;s login password.</p>
        </div>
        <div>
          <Label htmlFor="p-occupation">Occupation</Label>
          <Input id="p-occupation" value={occupation} onChange={(e) => setOccupation(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="p-address">Address</Label>
          <Input id="p-address" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Creating account..." : "Create parent account"}
        </Button>
      </form>
    </Dialog>
  );
}
