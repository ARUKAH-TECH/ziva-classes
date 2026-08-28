import type { SupabaseClient } from "@supabase/supabase-js";

export interface GradeResult {
  label: string;
  remark: string | null;
}

// Looks up the active grading scale for a student's academic level and
// returns the band matching the given percentage. Returns null if no
// active scale/band is configured — callers should leave the score
// ungraded rather than guessing, per §22 ("do not hard-code one grading
// system permanently").
// Untyped Supabase client generics (see src/lib/supabase/client.ts for why).
type AnySupabaseClient = SupabaseClient<any, any, any>;

export async function lookupGrade(
  supabase: AnySupabaseClient,
  academicLevelId: string,
  percentage: number
): Promise<GradeResult | null> {
  const { data: scale } = await supabase
    .from("grading_scales")
    .select("id")
    .eq("academic_level_id", academicLevelId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  const scaleId = (scale as { id: string } | null)?.id;
  if (!scaleId) return null;

  const { data: band } = await supabase
    .from("grade_bands")
    .select("grade_label, remark")
    .eq("grading_scale_id", scaleId)
    .lte("min_score", percentage)
    .gte("max_score", percentage)
    .limit(1)
    .maybeSingle();

  if (!band) return null;

  const b = band as { grade_label: string; remark: string | null };
  return { label: b.grade_label, remark: b.remark };
}
