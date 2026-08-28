import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { StudentAvatar } from "@/components/domain/student-avatar";
import { listMyChildren } from "@/lib/actions/parent-children";
import { getStudentAttendanceSummary } from "@/lib/actions/attendance";
import { getStudentPerformanceSummary } from "@/lib/actions/scores";
import { listStudentCharges } from "@/lib/actions/charges";

export default async function ParentDashboardPage() {
  const children = await listMyChildren();
  const attendance = await Promise.all(children.map((c) => getStudentAttendanceSummary(c.id)));
  const performance = await Promise.all(children.map((c) => getStudentPerformanceSummary(c.id)));
  const charges = await Promise.all(children.map((c) => listStudentCharges(c.id)));

  return (
    <div className="space-y-6">
      <div>
        <h1>Welcome</h1>
        <p className="mt-1 text-sm text-ink-500">Here&apos;s an overview of your children.</p>
      </div>

      <div>
        <h2 className="mb-3">My Children</h2>
        {children.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState
                icon={Users}
                title="No children linked to your account yet"
                description="Once the school links your child's profile to your account, their details will appear here."
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {children.map((c, i) => {
              const att = attendance[i];
              const perf = performance[i];
              const balance = Math.round(charges[i].reduce((s, c) => s + c.balance, 0) * 100) / 100;
              return (
                <Card key={c.id}>
                  <CardContent className="py-5">
                    <div className="flex items-center gap-3">
                      <StudentAvatar url={c.photo_url} name={`${c.first_name} ${c.last_name}`} size={48} />
                      <div>
                        <p className="font-semibold text-navy-900">
                          {c.first_name} {c.last_name}
                        </p>
                        <p className="text-sm text-ink-500">{c.class_name ?? "Not enrolled"}</p>
                      </div>
                    </div>

                    <dl className="mt-4 space-y-2 text-sm">
                      <Row label="Status">
                        <Badge variant={c.status === "ACTIVE" ? "success" : "neutral"}>{c.status}</Badge>
                      </Row>
                      <Row label="Current location">{c.location_summary ?? "—"}</Row>
                      <Row label="Attendance">
                        {att.percentage !== null ? (
                          <span className="font-medium text-navy-900">{att.percentage}%</span>
                        ) : (
                          <span className="text-ink-500">No sessions recorded yet</span>
                        )}
                      </Row>
                      <Row label="Academic average">
                        {perf.overall_average !== null ? (
                          <span className="font-medium text-navy-900">{perf.overall_average}%</span>
                        ) : (
                          <span className="text-ink-500">No scores recorded yet</span>
                        )}
                      </Row>
                      <Row label="Outstanding fees">
                        {charges[i].length === 0 ? (
                          <span className="text-ink-500">No charges yet</span>
                        ) : (
                          <span className={`font-medium ${balance > 0 ? "text-warning" : "text-success"}`}>
                            GH₵{balance}
                          </span>
                        )}
                      </Row>
                    </dl>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-500">{label}</dt>
      <dd className="text-right text-navy-900">{children}</dd>
    </div>
  );
}
