// Hand-written minimal types covering what Phase 1 (auth + shell) touches.
//
// Once the Supabase project exists, regenerate the full types from the live
// schema and replace this file entirely:
//   npx supabase gen types typescript --project-id <ref> > src/lib/types/database.ts
//
// Keep it hand-written only until then — do not let this drift from
// database/schema.sql + database/002_amendments.sql.

export type UserRole = "SUPER_ADMIN" | "ADMIN" | "TEACHER" | "PARENT" | "STUDENT";

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          motto: string | null;
          established_year: number | null;
          logo_url: string | null;
          phone: string | null;
          email: string | null;
          social_media: Record<string, string> | null;
          settings: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["organizations"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["organizations"]["Row"]>;
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          organization_id: string | null;
          role: UserRole;
          first_name: string;
          last_name: string;
          phone: string | null;
          email: string | null;
          profile_photo_path: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["users"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["users"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
