import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  console.log("[Middleware] Incoming cookies:", request.cookies.getAll());
  if (process.env.NODE_ENV === "development") {
    console.log("[Middleware] Using development mode bypass");
    // For development, we'll consider the user as authenticated
    // This allows access to protected routes without actual authentication
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );
  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  // IMPORTANT: DO NOT REMOVE auth.getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log(
    "[Middleware] User auth status:",
    user ? `Authenticated (${user.email})` : "Not authenticated"
  );
  console.log("[Middleware] Path:", request.nextUrl.pathname);

  if (user) {
    console.log("[Middleware] Checking auth routes...");
    if (
      request.nextUrl.pathname.startsWith("/login") ||
      request.nextUrl.pathname.startsWith("/auth")
    ) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  } else {
    console.log("[Middleware] Checking protected routes...");
    if (request.nextUrl.pathname.startsWith("/dashboard")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  console.log(
    "[Middleware] Final response cookies:",
    supabaseResponse.cookies.getAll()
  );
  return supabaseResponse;
}
