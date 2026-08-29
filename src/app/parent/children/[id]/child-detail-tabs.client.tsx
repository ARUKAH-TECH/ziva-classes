"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Package } from "lucide-react";
import type { CurrentEnrollment } from "@/lib/actions/students";
import type { StudentSubjectRow } from "@/lib/actions/student-subjects";
import type { AttendanceSummary } from "@/lib/actions/attendance";
import type { StudentPerformanceSummary } from "@/lib/actions/scores";
import type { StudentLocation } from "@/lib/actions/student-location";
import type { StudentNeedRow } from "@/lib/actions/student-needs";
import type { ClassMaterialRow } from "@/lib/actions/class-materials";
import { ChildLocationPanel } from "./location-panel.client";
import { ChildPhotoPanel } from "./photo-panel.client";
import { PerformanceChart } from "@/components/domain/performance-chart.client";

export function ChildDetailTabs({
  studentId,
  photoUrl,
  enrollment,
  subjects,
  attendance,
  performance,
  balance,
  locations,
  needs,
  canEditLocation,
  canEditPhoto,
  materials,
}: {
  studentId: string;
  photoUrl: string | null;
  enrollment: CurrentEnrollment | null;
  subjects: StudentSubjectRow[];
  attendance: AttendanceSummary;
  performance: StudentPerformanceSummary;
  balance: number;
  locations: StudentLocation[];
  needs: StudentNeedRow[];
  canEditLocation: boolean;
  canEditPhoto: boolean;
  materials: ClassMaterialRow[];
}) {
  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="materials">Materials</TabsTrigger>
        <TabsTrigger value="location">Location</TabsTrigger>
        <TabsTrigger value="photo">Photo</TabsTrigger>
        <TabsTrigger value="feedback">Teacher Feedback</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Class" value={enrollment?.class_name ?? "Not enrolled"} />
              <Stat label="Attendance" value={attendance.percentage !== null ? `${attendance.percentage}%` : "—"} />
              <Stat label="Academic Average" value={performance.overall_average !== null ? `${performance.overall_average}%` : "—"} />
              <Stat
                label="Outstanding Fees"
                value={`GH₵${balance}`}
                accent={balance > 0 ? "warning" : "success"}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Subjects</CardTitle>
            </CardHeader>
            <CardContent>
              {subjects.length === 0 ? (
                <p className="text-sm text-ink-500">No subjects enrolled yet.</p>
              ) : (
                <ul className="space-y-2">
                  {subjects.map((s) => (
                    <li key={s.id} className="flex items-center gap-2 text-sm">
                      <Badge variant="royal">{s.subject_name}</Badge>
                      <span className="text-ink-500">{s.teacher_name ?? "No teacher assigned yet"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {performance.subject_averages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Performance by Subject</CardTitle>
              </CardHeader>
              <CardContent>
                <PerformanceChart data={performance.subject_averages} />
              </CardContent>
            </Card>
          )}
        </div>
      </TabsContent>

      <TabsContent value="materials">
        <Card>
          <CardHeader>
            <CardTitle>Required Materials</CardTitle>
          </CardHeader>
          <CardContent>
            {materials.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No materials listed"
                description="The school hasn't listed required books or items for this class yet."
              />
            ) : (
              <ul className="divide-y divide-gray-300 rounded border border-gray-300">
                {materials.map((m) => (
                  <li key={m.id} className="px-3 py-2.5 text-sm">
                    <span className="font-medium text-navy-900">{m.name}</span>
                    {m.description && <span className="text-ink-500"> — {m.description}</span>}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="location">
        <ChildLocationPanel studentId={studentId} locations={locations} canRequestChange={canEditLocation} />
      </TabsContent>

      <TabsContent value="photo">
        <ChildPhotoPanel studentId={studentId} photoUrl={photoUrl} canRequestChange={canEditPhoto} />
      </TabsContent>

      <TabsContent value="feedback">
        <Card>
          <CardHeader>
            <CardTitle>Educational Needs &amp; Support</CardTitle>
          </CardHeader>
          <CardContent>
            {needs.length === 0 ? (
              <p className="text-sm text-ink-500">No educational support notes have been shared yet.</p>
            ) : (
              <ul className="space-y-3">
                {needs.map((n) => (
                  <li key={n.id} className="rounded border border-gray-300 p-3">
                    <div className="flex items-center gap-2">
                      {n.subject_name && <Badge variant="neutral">{n.subject_name}</Badge>}
                      <Badge variant={n.priority === "HIGH" ? "error" : n.priority === "MEDIUM" ? "warning" : "neutral"}>
                        {n.priority}
                      </Badge>
                      <Badge variant={n.status === "RESOLVED" ? "success" : "neutral"}>{n.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-navy-900">{n.need_description}</p>
                    {n.recommended_support && (
                      <p className="mt-1 text-xs text-ink-500">Recommended: {n.recommended_support}</p>
                    )}
                    {n.interventions.length > 0 && (
                      <ul className="mt-2 space-y-1 border-t border-gray-300 pt-2 text-xs">
                        {n.interventions.map((iv) => (
                          <li key={iv.id}>
                            <span className="font-medium text-navy-900">{iv.intervention}</span>
                            {iv.outcome && <span className="text-ink-500"> — {iv.outcome}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "warning" | "success" }) {
  const color = accent === "warning" ? "text-warning" : accent === "success" ? "text-success" : "text-navy-900";
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`text-lg font-semibold ${color}`}>{value}</p>
    </div>
  );
}
