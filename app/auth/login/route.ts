// app/auth/login/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  
  const supabase = await createClient();
  console.log(email, password)
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  console.log(error)
  if (error) {
    // On error, redirect to an error page or back to login with an error message.
    // Here we simply redirect to /error.
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // On successful login, redirect to /dashboard.
  return new NextResponse(null, {
    status: 302,
    headers: {
      Location: '/dashboard',
    },
  });
}
