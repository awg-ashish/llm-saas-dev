// app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  console.log(code);
  // Use "next" if provided, default to /dashboard
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    console.log("CODE>>>>>>>>>>>>>>>>>>>>>>>", code);
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    error ?? console.log("ERROR>>>>>>>>>>>>", error);
    if (!error) {
      // Use x-forwarded-host if in production
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }
  // If code is missing or exchange fails, redirect to an error page.
  return NextResponse.redirect(`${origin}/login`);
}
