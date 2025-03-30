// app/dashboard/ClientDashboard.tsx
"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client"; // Client-side Supabase client
import { ChatInterface } from "@/components/chat-interface";
import { isDevMode } from "@/utils/dev-auth"; // Import our dev utility

interface ClientDashboardProps {
  userName: string;
}

export default function ClientDashboard({ userName }: ClientDashboardProps) {
  const router = useRouter();
  const supabase = createClient();

  // Define the sign-out handler.
  const handleSignOut = async () => {
    if (isDevMode()) {
      console.log("Development mode: Simulating sign out");
      // In dev mode, just redirect without trying to sign out
      router.push("/login");
      return;
    }
    await supabase.auth.signOut();
    router.push("/login");
  };

  return <ChatInterface userName={userName} onSignOut={handleSignOut} />;
}
