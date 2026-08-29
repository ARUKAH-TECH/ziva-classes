import { listStudents } from "@/lib/actions/students";
import { getStudentPhotoUrl } from "@/lib/actions/student-photo";
import { listClasses } from "@/lib/actions/classes";
import { listAcademicYears } from "@/lib/actions/academic-years";
import { isSuperAdmin } from "@/lib/actions/user-admin";
import { StudentsClient } from "./students.client";

export default async function StudentsPage() {
  const [students, classes, years, canViewPassword] = await Promise.all([
    listStudents(),
    listClasses(),
    listAcademicYears(),
    isSuperAdmin(),
  ]);

  const withPhotos = await Promise.all(
    students.map(async (s) => ({ ...s, photo_url: await getStudentPhotoUrl(s.passport_photo_path) }))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1>Students</h1>
        <p className="mt-1 text-sm text-ink-500">
          {students.length} student{students.length === 1 ? "" : "s"} enrolled.
        </p>
      </div>
      <StudentsClient
        initialStudents={withPhotos}
        classes={classes.filter((c) => c.active)}
        currentYear={years.find((y) => y.is_current) ?? years[0] ?? null}
        canViewPassword={canViewPassword}
      />
    </div>
  );
}
