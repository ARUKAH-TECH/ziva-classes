import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ROLE_HOME_PATH, ROLE_PATH_PREFIX, type UserRole } from "@/lib/permissions/roles";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

const PUBLIC_PATHS = ["/login", "/register"];

// Always reachable regardless of auth state — a password-recovery link
// lands here with no session cookie yet (so the unauthenticated-redirect
// branch below would otherwise bounce it to /login, discarding the
// recovery token in the URL), and once supabase-js processes the link
// client-side the visitor *does* have a session, so the "already signed
// in" branch would otherwise bounce them to their role home before they
// can set a new password.
const ALWAYS_ACCESSIBLE_PATHS = ["/reset-password"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (ALWAYS_ACCESSIBLE_PATHS.some((p) => path.startsWith(p))) {
    return response;
  }

  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user) {
    if (isPublic) {
      // Already signed in — send them to their portal instead of the login form.
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      const role = profile?.role as UserRole | undefined;
      const url = request.nextUrl.clone();
      url.pathname = role ? ROLE_HOME_PATH[role] : "/login";
      return NextResponse.redirect(url);
    }

    // Role-gate the /admin, /teacher, /parent, /student sections.
    const matchedPrefix = Object.values(ROLE_PATH_PREFIX).find((prefix) =>
      path.startsWith(prefix)
    );
    if (matchedPrefix) {
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      const role = profile?.role as UserRole | undefined;
      const allowedPrefix = role ? ROLE_PATH_PREFIX[role] : null;
      if (!allowedPrefix || !path.startsWith(allowedPrefix)) {
        const url = request.nextUrl.clone();
        url.pathname = role ? ROLE_HOME_PATH[role] : "/login";
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|icons/|api/|manifest\\.webmanifest|sw\\.js).*)",
  ],
};
