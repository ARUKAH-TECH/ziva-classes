import { Wallet } from "lucide-react";
import { listMyChildren } from "@/lib/actions/parent-children";
import { listStudentCharges } from "@/lib/actions/charges";
import { listPayments } from "@/lib/actions/payments";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";

export default async function ParentFeesPage() {
  const children = await listMyChildren();
  const [charges, payments] = await Promise.all([
    Promise.all(children.map((c) => listStudentCharges(c.id))),
    Promise.all(children.map((c) => listPayments(c.id))),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1>Fees &amp; Payments</h1>
        <p className="mt-1 text-sm text-ink-500">Your children&apos;s charges, balances, and payment history.</p>
      </div>

      {children.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState icon={Wallet} title="No children linked" description="Link a child to see their fees here." />
          </CardContent>
        </Card>
      ) : (
        children.map((child, i) => {
          const childCharges = charges[i];
          const childPayments = payments[i];
          const totalBalance = Math.round(childCharges.reduce((s, c) => s + c.balance, 0) * 100) / 100;

          return (
            <Card key={child.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>
                  {child.first_name} {child.last_name}
                </CardTitle>
                <Badge variant={totalBalance > 0 ? "warning" : "success"}>
                  {totalBalance > 0 ? `Outstanding: GH₵${totalBalance}` : "Fully paid"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-6">
                {childCharges.length === 0 ? (
                  <EmptyState icon={Wallet} title="No charges yet" description="Charges will appear here once generated." />
                ) : (
                  <div>
                    <p className="mb-2 text-sm font-medium text-navy-900">Charges</p>
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
                        {childCharges.map((c) => (
                          <TR key={c.id}>
                            <TD className="font-medium text-navy-900">{c.subject_name}</TD>
                            <TD>{c.term_name ?? "—"}</TD>
                            <TD>GH₵{c.amount_due}</TD>
                            <TD>GH₵{c.amount_paid}</TD>
                            <TD>GH₵{c.balance}</TD>
                          </TR>
                        ))}
                      </TBody>
                    </Table>
                  </div>
                )}

                {childPayments.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-navy-900">Payment history</p>
                    <Table>
                      <THead>
                        <TR>
                          <TH>Date</TH>
                          <TH>Method</TH>
                          <TH>Amount</TH>
                          <TH>Reference</TH>
                        </TR>
                      </THead>
                      <TBody>
                        {childPayments.map((p) => (
                          <TR key={p.id}>
                            <TD>{new Date(p.payment_date).toLocaleDateString()}</TD>
                            <TD>
                              <Badge variant="neutral">{p.payment_method === "MTN_MOBILE_MONEY" ? "MTN MoMo" : "Cash"}</Badge>
                            </TD>
                            <TD className="font-medium text-navy-900">GH₵{p.amount}</TD>
                            <TD>{p.reference ?? "—"}</TD>
                          </TR>
                        ))}
                      </TBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
