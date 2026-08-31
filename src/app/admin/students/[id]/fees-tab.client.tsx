"use client";

import { useState } from "react";
import { Plus, Wallet, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReceiptViewerButton } from "@/components/domain/receipt-viewer.client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import {
  createAdHocCharge,
  updateCharge,
  deleteCharge,
  applyFeeStructureToStudent,
  type StudentChargeRow,
  type ApplicableFeeStructureRow,
} from "@/lib/actions/charges";
import { createPayment, type PaymentRow, type PaymentMethod } from "@/lib/actions/payments";

export function FeesTab({
  studentId,
  charges,
  payments,
  applicableFeeStructures,
}: {
  studentId: string;
  charges: StudentChargeRow[];
  payments: PaymentRow[];
  applicableFeeStructures: ApplicableFeeStructureRow[];
}) {
  const [payOpen, setPayOpen] = useState(false);
  const [addChargeOpen, setAddChargeOpen] = useState(false);
  const [editingCharge, setEditingCharge] = useState<StudentChargeRow | null>(null);
  const [applying, setApplying] = useState<string | null>(null);
  const outstanding = charges.filter((c) => c.balance > 0);
  const totalBalance = Math.round(charges.reduce((s, c) => s + c.balance, 0) * 100) / 100;

  async function apply(fs: ApplicableFeeStructureRow) {
    setApplying(fs.id);
    const result = await applyFeeStructureToStudent(studentId, fs.id);
    setApplying(null);
    if (!result.success) {
      alert(result.error);
      return;
    }
    window.location.reload();
  }

  async function remove(c: StudentChargeRow) {
    if (!confirm(`Remove the "${c.subject_name}" charge (GH₵${c.amount_due})?`)) return;
    const result = await deleteCharge(c.id, studentId);
    if (!result.success) {
      alert(result.error);
      return;
    }
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      {applicableFeeStructures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Applicable fee structures</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-ink-500">
              Class/subject fees that apply to this student and haven&apos;t been billed yet — apply
              one directly instead of running &quot;Generate charges&quot; for the whole class.
            </p>
            <ul className="divide-y divide-gray-300 rounded border border-gray-300">
              {applicableFeeStructures.map((fs) => (
                <li key={fs.id} className="flex items-center justify-between px-3 py-2.5 text-sm">
                  <span>
                    <span className="font-medium text-navy-900">{fs.label}</span>
                    <span className="text-ink-500">
                      {" "}
                      · {fs.term_name ?? "All terms"} · GH₵{fs.amount}
                    </span>
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => apply(fs)} disabled={applying === fs.id}>
                    {applying === fs.id ? "Applying..." : "Apply"}
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Charges</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setAddChargeOpen(true)}>
              <Plus className="h-4 w-4" /> Add charge
            </Button>
            <Button size="sm" onClick={() => setPayOpen(true)} disabled={outstanding.length === 0}>
              <Plus className="h-4 w-4" /> Record payment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {charges.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No charges yet"
              description="Charges appear once generated from Fees & Payments for a term this student is enrolled in, or you can add one directly with Add charge."
            />
          ) : (
            <>
              <Table>
                <THead>
                  <TR>
                    <TH>Subject</TH>
                    <TH>Term</TH>
                    <TH>Amount Due</TH>
                    <TH>Amount Paid</TH>
                    <TH>Balance</TH>
                    <TH className="text-right">Actions</TH>
                  </TR>
                </THead>
                <TBody>
                  {charges.map((c) => (
                    <TR key={c.id}>
                      <TD className="font-medium text-navy-900">{c.subject_name}</TD>
                      <TD>{c.term_name ?? "—"}</TD>
                      <TD>GH₵{c.amount_due}</TD>
                      <TD>GH₵{c.amount_paid}</TD>
                      <TD>
                        <Badge variant={c.balance > 0 ? "warning" : "success"}>GH₵{c.balance}</Badge>
                      </TD>
                      <TD className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setEditingCharge(c)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(c)}
                            disabled={c.amount_paid > 0}
                            title={c.amount_paid > 0 ? "Can't delete — a payment is recorded against this charge" : undefined}
                          >
                            <Trash2 className="h-4 w-4 text-error" />
                          </Button>
                        </div>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
              <p className="mt-3 text-right text-sm font-medium text-navy-900">
                Total outstanding: GH₵{totalBalance}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment history &amp; receipts</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-ink-500">No payments recorded yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-gray-200">
              {[...payments]
                .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
                .map((p) => {
                  const d = new Date(p.payment_date);
                  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
                  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
                  return (
                    <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-navy-900">GH₵{p.amount}</span>
                          <Badge variant="neutral">
                            {p.payment_method === "MTN_MOBILE_MONEY" ? "MTN MoMo" : "Cash"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-ink-500">
                          {date} at {time}
                          {p.reference ? ` · Ref: ${p.reference}` : ""}
                          {p.recorded_by_name ? ` · Recorded by ${p.recorded_by_name}` : ""}
                        </p>
                        <p className="mt-1 text-xs text-ink-500">
                          {p.allocations.map((a) => `${a.subject_name}: GH₵${a.amount_allocated}`).join(", ") || "—"}
                        </p>
                      </div>
                      <ReceiptViewerButton paymentId={p.id} />
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {payOpen && (
        <RecordPaymentDialog studentId={studentId} outstanding={outstanding} onClose={() => setPayOpen(false)} />
      )}
      {addChargeOpen && (
        <AddChargeDialog studentId={studentId} onClose={() => setAddChargeOpen(false)} />
      )}
      {editingCharge && (
        <EditChargeDialog
          studentId={studentId}
          charge={editingCharge}
          onClose={() => setEditingCharge(null)}
        />
      )}
    </div>
  );
}

function AddChargeDialog({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = parseFloat(amount);
    if (!description || Number.isNaN(amt) || amt <= 0) {
      setError("Enter a description and a positive amount.");
      return;
    }
    setBusy(true);
    const result = await createAdHocCharge(studentId, description, amt);
    setBusy(false);
    if (result.success) {
      window.location.reload();
    } else {
      setError(result.error);
    }
  }

  return (
    <Dialog open onClose={onClose} title="Add individual charge">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-ink-500">
          A one-off charge for this student only — e.g. a late-registration fee or a damaged-book
          fine. For fees that apply to a whole class or subject, use Fees &amp; Payments instead.
        </p>
        {error && <Alert variant="error">{error}</Alert>}
        <div>
          <Label htmlFor="ac-description">Description</Label>
          <Input
            id="ac-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Late registration fee"
            required
          />
        </div>
        <div>
          <Label htmlFor="ac-amount">Amount (GH₵)</Label>
          <Input
            id="ac-amount"
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Adding..." : "Add charge"}
        </Button>
      </form>
    </Dialog>
  );
}

function EditChargeDialog({
  studentId,
  charge,
  onClose,
}: {
  studentId: string;
  charge: StudentChargeRow;
  onClose: () => void;
}) {
  const [description, setDescription] = useState(charge.subject_name);
  const [amount, setAmount] = useState(String(charge.amount_due));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = parseFloat(amount);
    if (!description || Number.isNaN(amt) || amt <= 0) {
      setError("Enter a description and a positive amount.");
      return;
    }
    setBusy(true);
    const result = await updateCharge(charge.id, studentId, { description, amount_due: amt });
    setBusy(false);
    if (result.success) {
      window.location.reload();
    } else {
      setError(result.error);
    }
  }

  return (
    <Dialog open onClose={onClose} title="Edit charge">
      <form onSubmit={submit} className="space-y-4">
        {charge.amount_paid > 0 && (
          <Alert variant="warning">
            GH₵{charge.amount_paid} has already been paid against this charge — the new amount
            can&apos;t be less than that.
          </Alert>
        )}
        {error && <Alert variant="error">{error}</Alert>}
        <div>
          <Label htmlFor="ec-description">Description</Label>
          <Input id="ec-description" value={description} onChange={(e) => setDescription(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="ec-amount">Amount (GH₵)</Label>
          <Input
            id="ec-amount"
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Saving..." : "Save changes"}
        </Button>
      </form>
    </Dialog>
  );
}

function RecordPaymentDialog({
  studentId,
  outstanding,
  onClose,
}: {
  studentId: string;
  outstanding: StudentChargeRow[];
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("MTN_MOBILE_MONEY");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function autoAllocate(amt: number) {
    let remaining = amt;
    const next: Record<string, string> = {};
    for (const c of outstanding) {
      if (remaining <= 0) break;
      const take = Math.min(c.balance, remaining);
      if (take > 0) {
        next[c.id] = take.toFixed(2);
        remaining -= take;
      }
    }
    setAllocations(next);
  }

  function onAmountChange(v: string) {
    setAmount(v);
    const n = parseFloat(v);
    if (!Number.isNaN(n) && n > 0) autoAllocate(n);
  }

  const allocatedTotal = Object.values(allocations).reduce((s, v) => s + (parseFloat(v) || 0), 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const amt = parseFloat(amount);
    if (Number.isNaN(amt) || amt <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }

    setBusy(true);
    const result = await createPayment({
      student_id: studentId,
      amount: amt,
      payment_method: method,
      reference,
      notes,
      allocations: Object.entries(allocations)
        .filter(([, v]) => parseFloat(v) > 0)
        .map(([student_charge_id, v]) => ({ student_charge_id, amount_allocated: parseFloat(v) })),
    });
    setBusy(false);
    if (result.success) {
      window.location.reload();
    } else {
      setError(result.error);
    }
  }

  return (
    <Dialog open onClose={onClose} title="Record payment" className="max-w-xl">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="pay-amount">Amount (GH₵)</Label>
            <Input
              id="pay-amount"
              type="number"
              min={0.01}
              step={0.01}
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="pay-method">Payment method</Label>
            <Select id="pay-method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              <option value="MTN_MOBILE_MONEY">MTN Mobile Money</option>
              <option value="CASH">Cash</option>
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="pay-reference">Reference (optional)</Label>
          <Input id="pay-reference" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="MoMo transaction ID" />
        </div>

        <div>
          <Label>Allocate to charges</Label>
          <p className="mb-2 text-xs text-ink-500">Auto-filled oldest-first — adjust as needed.</p>
          <ul className="space-y-2 rounded border border-gray-300 p-3">
            {outstanding.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 text-sm">
                <span>
                  {c.subject_name} <span className="text-ink-500">(balance GH₵{c.balance})</span>
                </span>
                <Input
                  type="number"
                  min={0}
                  max={c.balance}
                  step={0.01}
                  value={allocations[c.id] ?? ""}
                  onChange={(e) => setAllocations((prev) => ({ ...prev, [c.id]: e.target.value }))}
                  className="w-28"
                />
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-500">
            Allocated: GH₵{allocatedTotal.toFixed(2)} of GH₵{amount || "0.00"}
          </p>
        </div>

        <div>
          <Label htmlFor="pay-notes">Notes (optional)</Label>
          <Textarea id="pay-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>

        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Saving..." : "Record payment"}
        </Button>
      </form>
    </Dialog>
  );
}
