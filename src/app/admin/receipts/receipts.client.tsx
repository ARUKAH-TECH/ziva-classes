"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Printer, Receipt as ReceiptIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { AllPaymentRow } from "@/lib/actions/payments";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
  };
}

export function ReceiptsClient({ payments }: { payments: AllPaymentRow[] }) {
  const [query, setQuery] = useState("");

  // Payments already arrive newest-first from listAllPayments — this just
  // re-asserts it so the list stays correct even if the query result order
  // ever changes upstream.
  const sorted = useMemo(
    () => [...payments].sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()),
    [payments]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (p) => p.student_name.toLowerCase().includes(q) || p.student_number.toLowerCase().includes(q)
    );
  }, [sorted, query]);

  return (
    <Card>
      <CardContent>
        <div className="mb-4">
          <Input
            placeholder="Search by student name or ID…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {payments.length === 0 ? (
          <EmptyState
            icon={ReceiptIcon}
            title="No receipts yet"
            description="Receipts appear here as soon as a payment is recorded on a student's Fees tab."
          />
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-500">No receipts match &quot;{query}&quot;.</p>
        ) : (
          <div className="flex flex-col divide-y divide-gray-200">
            {filtered.map((p) => {
              const { date, time } = formatDateTime(p.payment_date);
              return (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/students/${p.student_id}`}
                        className="font-medium text-navy-900 hover:underline"
                      >
                        {p.student_name}
                      </Link>
                      <span className="text-xs text-ink-500">{p.student_number}</span>
                      <Badge variant="neutral">{p.payment_method === "MTN_MOBILE_MONEY" ? "MTN MoMo" : "Cash"}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-ink-500">
                      {date} at {time}
                      {p.reference ? ` · Ref: ${p.reference}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-navy-900">GH₵{p.amount}</span>
                    <a href={`/api/payments/${p.id}/receipt`} target="_blank" rel="noreferrer">
                      <Button variant="ghost" size="sm">
                        <Printer className="h-4 w-4" /> Print
                      </Button>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
