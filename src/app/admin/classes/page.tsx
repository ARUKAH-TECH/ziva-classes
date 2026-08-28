import { listClasses } from "@/lib/actions/classes";
import { listAcademicLevels } from "@/lib/actions/academic-levels";
import { ClassesClient } from "./classes.client";

export default async function ClassesPage() {
  const [classes, levels] = await Promise.all([listClasses(), listAcademicLevels()]);

  return (
    <div className="space-y-6">
      <div>
        <h1>Classes</h1>
        <p className="mt-1 text-sm text-ink-500">
          Classes within each academic level. Open a class to assign its subjects.
        </p>
      </div>
      <ClassesClient initialClasses={classes} levels={levels} />
    </div>
  );
}
