import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getClass, listClassSubjects } from "@/lib/actions/classes";
import { listSubjects } from "@/lib/actions/subjects";
import { listClassMaterials } from "@/lib/actions/class-materials";
import { Badge } from "@/components/ui/badge";
import { ClassSubjectsClient } from "./class-subjects.client";
import { ClassMaterialsClient } from "./class-materials.client";

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [classRow, classSubjects, allSubjects, materials] = await Promise.all([
    getClass(id),
    listClassSubjects(id),
    listSubjects(),
    listClassMaterials(id),
  ]);

  if (!classRow) notFound();

  const assignedSubjectIds = new Set(classSubjects.map((cs) => cs.subject_id));
  const availableSubjects = allSubjects.filter((s) => s.active && !assignedSubjectIds.has(s.id));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/classes"
          className="mb-2 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-navy-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to classes
        </Link>
        <div className="flex items-center gap-3">
          <h1>{classRow.name}</h1>
          <Badge variant={classRow.active ? "success" : "neutral"}>
            {classRow.active ? "Active" : "Inactive"}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-ink-500">{classRow.academic_level_name}</p>
      </div>

      <ClassSubjectsClient
        classId={id}
        initialClassSubjects={classSubjects}
        availableSubjects={availableSubjects}
      />

      <ClassMaterialsClient classId={id} initialMaterials={materials} />
    </div>
  );
}
