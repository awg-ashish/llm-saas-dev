// app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server"; // Server-side Supabase client
import ClientDashboard from "./ClientDashboard"; // Client wrapper for interactive logic
import { DEV_USER, isDevMode } from "@/utils/dev-auth"; // Import our dev utilities
export default async function DashboardPage() {
  // Check if we're in development mode
  console.log(isDevMode());
  if (isDevMode()) {
    console.log("[Dashboard Page] Using development mode with mock user");
    // Use the mock dev user
    const mockUserName = DEV_USER.user_metadata?.name || "Development User";
    return <ClientDashboard userName={mockUserName} />;
  }
  // Create a server-side Supabase client and revalidate the auth token.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  console.log("[Dashboard Page] Server-side user:", user ? user.id : "No user");
  // If no valid user is found, redirect to the login page.
  if (!user) {
    console.log("[Dashboard Page] Redirecting to login");
    redirect("/login");
  }

  // Attempt to fetch the user's profile.
  let profile;
  const { data, error } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .maybeSingle();

  // If the profile is not found, create one.
  if (error || !data) {
    const userName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email ||
      "User";
    const { data: newProfile, error: insertError } = await supabase
      .from("profiles")
      .insert([{ id: user.id, name: userName }])
      .select()
      .maybeSingle();

    profile = insertError || !newProfile ? { name: "Guest" } : newProfile;
  } else {
    profile = data;
  }

  // Pass the minimal props (user's name) to the client wrapper.
  return <ClientDashboard userName={profile?.name || "Guest"} />;
}
