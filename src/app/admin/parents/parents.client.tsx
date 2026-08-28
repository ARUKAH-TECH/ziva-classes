"use client";

import { useState } from "react";
import { Plus, UserCog, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { createParent, setParentActive, type ParentRow } from "@/lib/actions/parents";

export function ParentsClient({ initialParents }: { initialParents: ParentRow[] }) {
  const [parents, setParents] = useState(initialParents);
  const [addOpen, setAddOpen] = useState(false);

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
                  <TD>{p.email ?? "—"}</TD>
                  <TD>{p.phone ?? "—"}</TD>
                  <TD>{p.occupation ?? "—"}</TD>
                  <TD>
                    <Badge variant={p.is_active ? "success" : "neutral"}>
                      {p.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TD>
                  <TD className="text-right">
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
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardContent>

      <AddParentDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </Card>
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
  const [created, setCreated] = useState<{ email: string; tempPassword: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await createParent({ first_name: firstName, last_name: lastName, email, phone, occupation, address });
    setBusy(false);
    if (result.success) {
      setCreated({ email, tempPassword: result.data.tempPassword });
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
            {created.email} can now sign in. Share these temporary credentials securely.
          </Alert>
          <div className="rounded border border-gray-300 bg-surface p-3 font-mono text-sm">
            <p>Email: {created.email}</p>
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
          <Label htmlFor="p-email">Email</Label>
          <Input id="p-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="p-phone">Phone</Label>
          <Input id="p-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
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
