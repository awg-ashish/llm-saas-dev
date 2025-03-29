// app/dashboard/ClientDashboard.tsx
'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client'; // Client-side Supabase client
import { ChatInterface } from '@/components/chat-interface';

interface ClientDashboardProps {
  userName: string;
}

export default function ClientDashboard({ userName }: ClientDashboardProps) {
  const router = useRouter();
  const supabase = createClient();

  // Define the sign-out handler.
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return <ChatInterface userName={userName} onSignOut={handleSignOut} />;
}
