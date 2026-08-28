import Link from "next/link";
import { Users } from "lucide-react";
import { listMyChildren } from "@/lib/actions/parent-children";
import { StudentAvatar } from "@/components/domain/student-avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export default async function ParentChildrenPage() {
  const children = await listMyChildren();

  return (
    <div className="space-y-6">
      <div>
        <h1>My Children</h1>
        <p className="mt-1 text-sm text-ink-500">Select a child to see their full profile.</p>
      </div>

      {children.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Users}
              title="No children linked to your account yet"
              description="Once the school links your child's profile to your account, they will appear here."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {children.map((c) => (
            <Link key={c.id} href={`/parent/children/${c.id}`}>
              <Card className="transition-shadow hover:shadow-card">
                <CardContent className="flex items-center gap-3 py-5">
                  <StudentAvatar url={c.photo_url} name={`${c.first_name} ${c.last_name}`} size={48} />
                  <div>
                    <p className="font-semibold text-navy-900">
                      {c.first_name} {c.last_name}
                    </p>
                    <p className="text-sm text-ink-500">{c.class_name ?? "Not enrolled"}</p>
                    <Badge variant={c.status === "ACTIVE" ? "success" : "neutral"} className="mt-1">
                      {c.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
