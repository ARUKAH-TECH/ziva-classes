"use client";

import { useState } from "react";
import { Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import type { StudentChargeRow } from "@/lib/actions/charges";
import { createPayment, type PaymentRow, type PaymentMethod } from "@/lib/actions/payments";

export function FeesTab({
  studentId,
  charges,
  payments,
}: {
  studentId: string;
  charges: StudentChargeRow[];
  payments: PaymentRow[];
}) {
  const [payOpen, setPayOpen] = useState(false);
  const outstanding = charges.filter((c) => c.balance > 0);
  const totalBalance = Math.round(charges.reduce((s, c) => s + c.balance, 0) * 100) / 100;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Charges</CardTitle>
          <Button size="sm" onClick={() => setPayOpen(true)} disabled={outstanding.length === 0}>
            <Plus className="h-4 w-4" /> Record payment
          </Button>
        </CardHeader>
        <CardContent>
          {charges.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No charges yet"
              description="Charges appear once generated from Fees & Payments for a term this student is enrolled in."
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
          <CardTitle>Payment history</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-ink-500">No payments recorded yet.</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Date</TH>
                  <TH>Amount</TH>
                  <TH>Method</TH>
                  <TH>Reference</TH>
                  <TH>Allocated to</TH>
                  <TH>Recorded by</TH>
                </TR>
              </THead>
              <TBody>
                {payments.map((p) => (
                  <TR key={p.id}>
                    <TD>{new Date(p.payment_date).toLocaleDateString()}</TD>
                    <TD className="font-medium text-navy-900">GH₵{p.amount}</TD>
                    <TD>
                      <Badge variant="neutral">{p.payment_method === "MTN_MOBILE_MONEY" ? "MTN MoMo" : "Cash"}</Badge>
                    </TD>
                    <TD>{p.reference ?? "—"}</TD>
                    <TD className="text-xs">
                      {p.allocations.map((a) => `${a.subject_name}: GH₵${a.amount_allocated}`).join(", ") || "—"}
                    </TD>
                    <TD>{p.recorded_by_name ?? "—"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {payOpen && (
        <RecordPaymentDialog studentId={studentId} outstanding={outstanding} onClose={() => setPayOpen(false)} />
      )}
    </div>
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
