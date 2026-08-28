import { LifeBuoy } from "lucide-react";
import { listMyOwnVisibleNeeds } from "@/lib/actions/student-needs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export default async function StudentFeedbackPage() {
  const needs = await listMyOwnVisibleNeeds();

  return (
    <div className="space-y-6">
      <div>
        <h1>Feedback</h1>
        <p className="mt-1 text-sm text-ink-500">Educational support notes shared by your teachers.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Feedback &amp; Support</CardTitle>
        </CardHeader>
        <CardContent>
          {needs.length === 0 ? (
            <EmptyState icon={LifeBuoy} title="Nothing shared yet" description="Teacher feedback will appear here." />
          ) : (
            <ul className="space-y-3">
              {needs.map((n) => (
                <li key={n.id} className="rounded border border-gray-300 p-3">
                  <div className="flex items-center gap-2">
                    {n.subject_name && <Badge variant="neutral">{n.subject_name}</Badge>}
                    <Badge variant={n.priority === "HIGH" ? "error" : n.priority === "MEDIUM" ? "warning" : "neutral"}>
                      {n.priority}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-navy-900">{n.need_description}</p>
                  {n.recommended_support && <p className="mt-1 text-xs text-ink-500">Recommended: {n.recommended_support}</p>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
