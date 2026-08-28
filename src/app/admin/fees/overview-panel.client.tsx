import Link from "next/link";
import { Wallet, TrendingUp, CalendarDays, AlertCircle, Smartphone, Banknote } from "lucide-react";
import { StatCard } from "@/components/domain/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import type { FinancialDashboardStats, RecentPaymentRow } from "@/lib/actions/payments";

export function OverviewPanel({
  stats,
  recentPayments,
}: {
  stats: FinancialDashboardStats;
  recentPayments: RecentPaymentRow[];
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Total Collected" value={`GH₵${stats.total_collected}`} icon={Wallet} accent="success" />
        <StatCard label="Today's Collection" value={`GH₵${stats.today_collection}`} icon={CalendarDays} accent="gold" />
        <StatCard label="Monthly Collection" value={`GH₵${stats.month_collection}`} icon={TrendingUp} accent="royal" />
        <StatCard label="Outstanding Fees" value={`GH₵${stats.outstanding_fees}`} icon={AlertCircle} accent="warning" />
        <StatCard label="MTN MoMo Collection" value={`GH₵${stats.momo_collection}`} icon={Smartphone} accent="sky" />
        <StatCard label="Cash Collection" value={`GH₵${stats.cash_collection}`} icon={Banknote} accent="success" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Subject</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.revenue_by_subject.length === 0 ? (
              <p className="text-sm text-ink-500">No payments recorded yet.</p>
            ) : (
              <ul className="divide-y divide-gray-300">
                {stats.revenue_by_subject.map((r) => (
                  <li key={r.subject_name} className="flex justify-between py-2 text-sm">
                    <span className="text-navy-900">{r.subject_name}</span>
                    <span className="font-medium text-navy-900">GH₵{r.amount}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Class</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.revenue_by_class.length === 0 ? (
              <p className="text-sm text-ink-500">No payments recorded yet.</p>
            ) : (
              <ul className="divide-y divide-gray-300">
                {stats.revenue_by_class.map((r) => (
                  <li key={r.class_name} className="flex justify-between py-2 text-sm">
                    <span className="text-navy-900">{r.class_name}</span>
                    <span className="font-medium text-navy-900">GH₵{r.amount}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {recentPayments.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No payments recorded yet"
              description="Record a payment from a student's Fees tab — it will appear here."
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Student</TH>
                  <TH>Amount</TH>
                  <TH>Method</TH>
                  <TH>Date</TH>
                </TR>
              </THead>
              <TBody>
                {recentPayments.map((p) => (
                  <TR key={p.id}>
                    <TD className="font-medium text-navy-900">
                      <Link href={`/admin/students/${p.student_id}`} className="hover:text-royal-600 hover:underline">
                        {p.student_name}
                      </Link>
                    </TD>
                    <TD>GH₵{p.amount}</TD>
                    <TD>
                      <Badge variant="neutral">{p.payment_method === "MTN_MOBILE_MONEY" ? "MTN MoMo" : "Cash"}</Badge>
                    </TD>
                    <TD>{new Date(p.payment_date).toLocaleDateString()}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
