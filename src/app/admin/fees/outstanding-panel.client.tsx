"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { sendFeeReminder, type OutstandingRow } from "@/lib/actions/charges";

export function OutstandingPanel({ rows }: { rows: OutstandingRow[] }) {
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);

  async function remind(r: OutstandingRow) {
    setBusyId(r.student_id);
    const result = await sendFeeReminder(r.student_id, r.balance);
    setBusyId(null);
    if (!result.success) {
      alert(result.error);
      return;
    }
    setSentTo((prev) => new Set(prev).add(r.student_id));
  }

  return (
    <Card>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState
            icon={AlertCircle}
            title="No outstanding balances"
            description="Every generated charge has been fully paid, or no charges have been generated yet."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Student</TH>
                <TH>Total Due</TH>
                <TH>Total Paid</TH>
                <TH>Balance</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.student_id}>
                  <TD className="font-medium text-navy-900">
                    <Link href={`/admin/students/${r.student_id}`} className="hover:text-royal-600 hover:underline">
                      {r.student_name}
                    </Link>
                  </TD>
                  <TD>GH₵{r.total_due}</TD>
                  <TD>GH₵{r.total_paid}</TD>
                  <TD className="font-medium text-warning">GH₵{r.balance}</TD>
                  <TD className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remind(r)}
                      disabled={busyId === r.student_id || sentTo.has(r.student_id)}
                    >
                      <Bell className="h-4 w-4" /> {sentTo.has(r.student_id) ? "Reminder sent" : "Send reminder"}
                    </Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
